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
import { AgencyAuthService } from './agency-auth.service';
import { AgencyAuthGuard } from '../../common/guards/agency-auth.guard';
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

@Controller('auth/agency')
export class AgencyAuthController {
  constructor(private readonly agencyAuth: AgencyAuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(@Body() dto: RegisterDto) {
    return this.agencyAuth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const agency = await this.agencyAuth.validateCredentials(dto);
    await regenerateSession(req);
    req.session.auth = { id: agency.id, role: 'AGENCY' };
    return agency;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgencyAuthGuard)
  async logout(@Req() req: Request) {
    await destroySession(req);
    return { message: 'Logged out.' };
  }

  @Get('me')
  @UseGuards(AgencyAuthGuard)
  async me(@CurrentSession() session: { id: string }) {
    return this.agencyAuth.getProfile(session.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.agencyAuth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.agencyAuth.resetPassword(dto);
  }
}
