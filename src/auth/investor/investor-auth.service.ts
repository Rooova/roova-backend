import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../../mail/mail.service';
import { Investor, InvestorDocument } from './investor.schema';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_URL_BASE =
  process.env.INVESTOR_RESET_PASSWORD_URL ??
  'http://localhost:3000/reset-password';

function toPublicInvestor(investor: InvestorDocument) {
  return {
    id: investor._id.toString(),
    name: investor.name,
    email: investor.email,
    kycStatus: investor.kycStatus,
    createdAt: investor.createdAt,
    updatedAt: investor.updatedAt,
  };
}

@Injectable()
export class InvestorAuthService {
  constructor(
    @InjectModel(Investor.name)
    private readonly investorModel: Model<InvestorDocument>,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.investorModel.findOne({ email: dto.email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const investor = await this.investorModel.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return toPublicInvestor(investor);
  }

  async validateCredentials(dto: LoginDto) {
    const investor = await this.investorModel.findOne({ email: dto.email });
    if (
      !investor ||
      !(await bcrypt.compare(dto.password, investor.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return toPublicInvestor(investor);
  }

  async getProfile(id: string) {
    const investor = await this.investorModel.findById(id);
    if (!investor) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return toPublicInvestor(investor);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const investor = await this.investorModel.findOne({ email: dto.email });

    if (investor) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      investor.passwordResetTokenHash = tokenHash;
      investor.passwordResetExpiresAt = new Date(
        Date.now() + RESET_TOKEN_TTL_MS,
      );
      await investor.save();
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
    const investor = await this.investorModel.findOne({
      passwordResetTokenHash: tokenHash,
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

    investor.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    investor.passwordResetTokenHash = null;
    investor.passwordResetExpiresAt = null;
    await investor.save();

    return { message: 'Password updated successfully.' };
  }
}
