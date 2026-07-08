import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import type { Admin } from '../../prisma/client';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_URL_BASE =
  process.env.ADMIN_RESET_PASSWORD_URL ??
  'http://admin.localhost:3000/reset-password';

function toPublicAdmin(admin: Admin) {
  const {
    passwordHash,
    passwordResetTokenHash,
    passwordResetExpiresAt,
    ...rest
  } = admin;
  return rest;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // No self-service registration for admins — accounts are created via the
  // seed script (prisma/seed.ts), not a public endpoint.

  async validateCredentials(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });
    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return toPublicAdmin(admin);
  }

  async getProfile(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return toPublicAdmin(admin);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (admin) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      await this.mail.sendPasswordResetEmail(
        admin.email,
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
    const admin = await this.prisma.admin.findUnique({
      where: { passwordResetTokenHash: tokenHash },
    });

    if (
      !admin ||
      !admin.passwordResetExpiresAt ||
      admin.passwordResetExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'This reset link is invalid or has expired',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'Password updated successfully.' };
  }
}
