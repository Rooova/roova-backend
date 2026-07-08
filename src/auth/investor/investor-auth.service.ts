import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import type { Investor } from '../../prisma/client';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_URL_BASE =
  process.env.INVESTOR_RESET_PASSWORD_URL ??
  'http://localhost:3000/reset-password';

function toPublicInvestor(investor: Investor) {
  const {
    passwordHash,
    passwordResetTokenHash,
    passwordResetExpiresAt,
    ...rest
  } = investor;
  return rest;
}

@Injectable()
export class InvestorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.investor.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const investor = await this.prisma.investor.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });
    return toPublicInvestor(investor);
  }

  async validateCredentials(dto: LoginDto) {
    const investor = await this.prisma.investor.findUnique({
      where: { email: dto.email },
    });
    if (
      !investor ||
      !(await bcrypt.compare(dto.password, investor.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return toPublicInvestor(investor);
  }

  async getProfile(id: string) {
    const investor = await this.prisma.investor.findUnique({ where: { id } });
    if (!investor) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return toPublicInvestor(investor);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const investor = await this.prisma.investor.findUnique({
      where: { email: dto.email },
    });

    if (investor) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      await this.prisma.investor.update({
        where: { id: investor.id },
        data: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      await this.mail.sendPasswordResetEmail(
        investor.email,
        `${RESET_URL_BASE}?token=${rawToken}`,
      );
    }

    return {
      message:
        'If an account exists for this email, a reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');
    const investor = await this.prisma.investor.findUnique({
      where: { passwordResetTokenHash: tokenHash },
    });

    if (
      !investor ||
      !investor.passwordResetExpiresAt ||
      investor.passwordResetExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'This reset link is invalid or has expired',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    await this.prisma.investor.update({
      where: { id: investor.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'Password updated successfully.' };
  }
}
