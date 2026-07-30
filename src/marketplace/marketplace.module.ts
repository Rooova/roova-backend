import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketplaceListingController } from './marketplace-listing.controller';
import { PurchaseOfferController } from './purchase-offer.controller';
import { MarketplaceListingService } from './marketplace-listing.service';
import { PurchaseOfferService } from './purchase-offer.service';
import {
  MarketplaceListing,
  MarketplaceListingSchema,
} from './marketplace-listing.schema';
import { PurchaseOffer, PurchaseOfferSchema } from './purchase-offer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketplaceListing.name, schema: MarketplaceListingSchema },
      { name: PurchaseOffer.name, schema: PurchaseOfferSchema },
    ]),
  ],
  controllers: [MarketplaceListingController, PurchaseOfferController],
  providers: [MarketplaceListingService, PurchaseOfferService],
})
export class MarketplaceModule {}
