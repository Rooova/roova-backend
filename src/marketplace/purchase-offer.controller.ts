import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PurchaseOfferService } from './purchase-offer.service';
import { InvestorAuthGuard } from '../common/guards/investor-auth.guard';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { CreatePurchaseOfferDto } from './dto/create-purchase-offer.dto';

@Controller('purchase-offers')
@UseGuards(InvestorAuthGuard)
export class PurchaseOfferController {
  constructor(private readonly offers: PurchaseOfferService) {}

  @Post()
  async create(
    @CurrentSession() session: { id: string },
    @Body() dto: CreatePurchaseOfferDto,
  ) {
    return this.offers.create(session.id, dto);
  }

  @Get('mine')
  async findMine(@CurrentSession() session: { id: string }) {
    return this.offers.findMine(session.id);
  }

  @Post('mine/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
  ) {
    return this.offers.withdraw(session.id, id);
  }
}
