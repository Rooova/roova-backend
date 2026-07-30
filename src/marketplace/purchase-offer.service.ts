import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PurchaseOffer, PurchaseOfferDocument } from './purchase-offer.schema';
import {
  MarketplaceListing,
  MarketplaceListingDocument,
} from './marketplace-listing.schema';
import { toOfferSummary } from './marketplace.mappers';
import { CreatePurchaseOfferDto } from './dto/create-purchase-offer.dto';

@Injectable()
export class PurchaseOfferService {
  constructor(
    @InjectModel(PurchaseOffer.name)
    private readonly offerModel: Model<PurchaseOfferDocument>,
    @InjectModel(MarketplaceListing.name)
    private readonly listingModel: Model<MarketplaceListingDocument>,
  ) {}

  async create(buyerId: string, dto: CreatePurchaseOfferDto) {
    const listing = await this.listingModel.findById(dto.listingId);
    if (!listing || listing.status !== 'ACTIVE') {
      throw new ConflictException(
        'This listing is not currently accepting offers',
      );
    }

    if (
      dto.paymentPlan === 'FULL_PAYMENT' &&
      listing.paymentPlanType === 'INSTALLMENT'
    ) {
      throw new BadRequestException(
        'This listing only accepts installment offers',
      );
    }
    if (
      dto.paymentPlan === 'INSTALLMENT' &&
      listing.paymentPlanType === 'FULL_PAYMENT'
    ) {
      throw new BadRequestException(
        'This listing only accepts full-payment offers',
      );
    }
    if (dto.paymentPlan === 'INSTALLMENT') {
      if (
        dto.installmentDurationMonths === undefined ||
        !listing.installmentDurationMonths.includes(
          dto.installmentDurationMonths,
        )
      ) {
        throw new BadRequestException(
          'installmentDurationMonths must match one of the listing’s allowed durations',
        );
      }
    }

    const offer = await this.offerModel.create({
      listingId: listing._id,
      buyerId: new Types.ObjectId(buyerId),
      paymentPlan: dto.paymentPlan,
      downPaymentPct: dto.downPaymentPct,
      installmentDurationMonths: dto.installmentDurationMonths,
      offerAmount: dto.offerAmount,
      message: dto.message,
      status: 'PENDING',
    });

    return toOfferSummary(offer);
  }

  async findMine(buyerId: string) {
    const offers = await this.offerModel
      .find({ buyerId })
      .sort({ createdAt: -1 });

    const listingIds = [
      ...new Set(offers.map((offer) => offer.listingId.toString())),
    ];
    const listings = await this.listingModel.find(
      { _id: { $in: listingIds } },
      { title: 1, location: 1, price: 1, status: 1 },
    );
    const listingById = new Map(
      listings.map((listing) => [listing._id.toString(), listing]),
    );

    return offers.map((offer) => {
      const listing = listingById.get(offer.listingId.toString());
      return {
        offer: toOfferSummary(offer),
        listing: listing
          ? {
              id: listing._id.toString(),
              title: listing.title,
              location: listing.location,
              price: listing.price,
              status: listing.status,
            }
          : null,
      };
    });
  }

  async withdraw(buyerId: string, id: string) {
    const offer = await this.offerModel.findById(id);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.buyerId.toString() !== buyerId) {
      throw new ForbiddenException('Not your offer');
    }
    if (offer.status !== 'PENDING') {
      throw new ConflictException('Only pending offers can be withdrawn');
    }
    offer.status = 'WITHDRAWN';
    offer.respondedAt = new Date();
    await offer.save();
    return toOfferSummary(offer);
  }
}
