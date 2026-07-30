import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { InvestorAuthGuard } from '../common/guards/investor-auth.guard';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { CreateInvestmentDto } from './dto/create-investment.dto';

@Controller('investments')
@UseGuards(InvestorAuthGuard)
export class InvestmentController {
  constructor(private readonly investments: InvestmentService) {}

  @Post()
  async create(
    @CurrentSession() session: { id: string },
    @Body() dto: CreateInvestmentDto,
  ) {
    return this.investments.create(session.id, dto);
  }

  @Get('mine')
  async findMine(@CurrentSession() session: { id: string }) {
    return this.investments.findMine(session.id);
  }
}
