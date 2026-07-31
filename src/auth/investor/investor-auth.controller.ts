import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { InvestorAuthService } from './investor-auth.service';
import { InvestorAuthGuard } from '../../common/guards/investor-auth.guard';
import { CurrentSession } from '../../common/decorators/current-session.decorator';
import {
  regenerateSession,
  destroySession,
} from '../../common/utils/session.util';
import { AUTH_THROTTLE } from '../../common/constants/auth-throttle';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Controller('auth/investor')
export class InvestorAuthController {
  constructor(private readonly investorAuth: InvestorAuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(@Body() dto: RegisterDto) {
    return this.investorAuth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const investor = await this.investorAuth.validateCredentials(dto);
    await regenerateSession(req);
    req.session.auth = { id: investor.id, role: 'INVESTOR' };
    return investor;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InvestorAuthGuard)
  async logout(@Req() req: Request) {
    await destroySession(req);
    return { message: 'Logged out.' };
  }

  @Get('me')
  @UseGuards(InvestorAuthGuard)
  async me(@CurrentSession() session: { id: string }) {
    return this.investorAuth.getProfile(session.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.investorAuth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.investorAuth.resetPassword(dto);
  }
}
