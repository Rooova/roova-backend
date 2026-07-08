import { Injectable } from '@nestjs/common';
import { createSessionAuthGuard } from './session-role.guard';

@Injectable()
export class InvestorAuthGuard extends createSessionAuthGuard('INVESTOR') {}
