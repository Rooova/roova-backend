import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositService } from './deposit.service';
import { InvestorAuthGuard } from '../common/guards/investor-auth.guard';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { CreateDepositDto } from './dto/create-deposit.dto';

@Controller('wallet')
@UseGuards(InvestorAuthGuard)
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly deposits: DepositService,
  ) {}

  @Get()
  async findMine(@CurrentSession() session: { id: string }) {
    return this.wallet.findMine(session.id);
  }

  @Get('transactions')
  async findTransactions(@CurrentSession() session: { id: string }) {
    return this.wallet.findTransactions(session.id);
  }

  @Post('deposits')
  async createDeposit(
    @CurrentSession() session: { id: string },
    @Body() dto: CreateDepositDto,
  ) {
    return this.deposits.initiate(session.id, dto.amount);
  }

  @Get('deposits/:reference/verify')
  async verifyDeposit(
    @CurrentSession() session: { id: string },
    @Param('reference') reference: string,
  ) {
    return this.deposits.confirmByReference(reference, session.id);
  }
}
