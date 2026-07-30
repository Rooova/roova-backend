import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MarketplaceListingService } from './marketplace-listing.service';
import { AgencyAuthGuard } from '../common/guards/agency-auth.guard';
import { AgencyOrAdminGuard } from '../common/guards/agency-or-admin.guard';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { SessionRole } from '../common/guards/session-role.guard';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto';
import { UpdateMarketplaceListingDto } from './dto/update-marketplace-listing.dto';

@Controller('marketplace-listings')
export class MarketplaceListingController {
  constructor(private readonly listings: MarketplaceListingService) {}

  @Post()
  @UseGuards(AgencyAuthGuard)
  async create(
    @CurrentSession() session: { id: string },
    @Body() dto: CreateMarketplaceListingDto,
  ) {
    return this.listings.create(session.id, dto);
  }

  @Get('mine')
  @UseGuards(AgencyAuthGuard)
  async findMine(@CurrentSession() session: { id: string }) {
    return this.listings.findMine(session.id);
  }

  @Patch('mine/:id')
  @UseGuards(AgencyAuthGuard)
  async updateMine(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateMarketplaceListingDto,
  ) {
    return this.listings.updateMine(session.id, id, dto);
  }

  @Post('mine/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgencyAuthGuard)
  async withdraw(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
  ) {
    return this.listings.withdraw(session.id, id);
  }

  @Post('mine/:id/mark-sold')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgencyAuthGuard)
  async markSold(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
  ) {
    return this.listings.markSold(session.id, id);
  }

  @Get('mine/:id/full')
  @UseGuards(AgencyOrAdminGuard)
  async findFull(
    @CurrentSession() session: { id: string; role: SessionRole },
    @Param('id') id: string,
  ) {
    return this.listings.findFull(session, id);
  }

  @Post('mine/:listingId/offers/:offerId/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgencyAuthGuard)
  async acceptOffer(
    @CurrentSession() session: { id: string },
    @Param('listingId') listingId: string,
    @Param('offerId') offerId: string,
  ) {
    return this.listings.acceptOffer(session.id, listingId, offerId);
  }

  @Post('mine/:listingId/offers/:offerId/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgencyAuthGuard)
  async rejectOffer(
    @CurrentSession() session: { id: string },
    @Param('listingId') listingId: string,
    @Param('offerId') offerId: string,
  ) {
    return this.listings.rejectOffer(session.id, listingId, offerId);
  }

  @Get()
  async findPublicList() {
    return this.listings.findPublicList();
  }

  @Get(':id')
  async findPublicById(@Param('id') id: string) {
    return this.listings.findPublicById(id);
  }
}
