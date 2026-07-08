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
import type { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { CurrentSession } from '../../common/decorators/current-session.decorator';
import {
  regenerateSession,
  destroySession,
} from '../../common/utils/session.util';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const admin = await this.adminAuth.validateCredentials(dto);
    await regenerateSession(req);
    req.session.auth = { id: admin.id, role: 'ADMIN' };
    return admin;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  async logout(@Req() req: Request) {
    await destroySession(req);
    return { message: 'Logged out.' };
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async me(@CurrentSession() session: { id: string }) {
    return this.adminAuth.getProfile(session.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.adminAuth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.adminAuth.resetPassword(dto);
  }
}
