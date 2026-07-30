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
import { Agency, AgencyDocument } from './agency.schema';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_URL_BASE =
  process.env.AGENCY_RESET_PASSWORD_URL ??
  'http://agency.localhost:3000/reset-password';

function toPublicAgency(agency: AgencyDocument) {
  return {
    id: agency._id.toString(),
    name: agency.name,
    email: agency.email,
    tier: agency.tier,
    status: agency.status,
    createdAt: agency.createdAt,
    updatedAt: agency.updatedAt,
  };
}

@Injectable()
export class AgencyAuthService {
  constructor(
    @InjectModel(Agency.name)
    private readonly agencyModel: Model<AgencyDocument>,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.agencyModel.findOne({ email: dto.email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const agency = await this.agencyModel.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return toPublicAgency(agency);
  }

  async validateCredentials(dto: LoginDto) {
    const agency = await this.agencyModel.findOne({ email: dto.email });
    if (!agency || !(await bcrypt.compare(dto.password, agency.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return toPublicAgency(agency);
  }

  async getProfile(id: string) {
    const agency = await this.agencyModel.findById(id);
    if (!agency) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return toPublicAgency(agency);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const agency = await this.agencyModel.findOne({ email: dto.email });

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to discover which emails are registered.
    if (agency) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      agency.passwordResetTokenHash = tokenHash;
      agency.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await agency.save();
      await this.mail.sendPasswordResetEmail(
        agency.email,
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
    const agency = await this.agencyModel.findOne({
      passwordResetTokenHash: tokenHash,
    });

    if (
      !agency ||
      !agency.passwordResetExpiresAt ||
      agency.passwordResetExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'This reset link is invalid or has expired',
      );
    }

    agency.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    agency.passwordResetTokenHash = null;
    agency.passwordResetExpiresAt = null;
    await agency.save();

    return { message: 'Password updated successfully.' };
  }
}
