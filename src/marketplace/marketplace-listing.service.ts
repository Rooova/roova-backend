import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MarketplaceListing,
  MarketplaceListingDocument,
  PaymentPlanType,
} from './marketplace-listing.schema';
import { PurchaseOffer, PurchaseOfferDocument } from './purchase-offer.schema';
import { SessionRole } from '../common/guards/session-role.guard';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto';
import { UpdateMarketplaceListingDto } from './dto/update-marketplace-listing.dto';
import { toListingSummary, toOfferSummary } from './marketplace.mappers';

const EDITABLE_STATUSES = ['ACTIVE', 'UNDER_OFFER'];

function assertInstallmentFieldsValid(
  planType: PaymentPlanType,
  downPaymentPct: number | null | undefined,
  installmentDurationMonths: number[] | undefined,
) {
  if (planType === 'FULL_PAYMENT') return;
  if (downPaymentPct === null || downPaymentPct === undefined) {
    throw new BadRequestException(
      'downPaymentPct is required when the payment plan includes installments',
    );
  }
  if (!installmentDurationMonths || installmentDurationMonths.length === 0) {
    throw new BadRequestException(
      'installmentDurationMonths must include at least one option when the payment plan includes installments',
    );
  }
}

@Injectable()
export class MarketplaceListingService {
  constructor(
    @InjectModel(MarketplaceListing.name)
    private readonly listingModel: Model<MarketplaceListingDocument>,
    @InjectModel(PurchaseOffer.name)
    private readonly offerModel: Model<PurchaseOfferDocument>,
  ) {}

  async create(agencyId: string, dto: CreateMarketplaceListingDto) {
    assertInstallmentFieldsValid(
      dto.paymentPlanType,
      dto.downPaymentPct,
      dto.installmentDurationMonths,
    );

    const listing = await this.listingModel.create({
      agencyId: new Types.ObjectId(agencyId),
      title: dto.title,
      location: dto.location,
      description: dto.description,
      price: dto.price,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      sizeSqm: dto.sizeSqm,
      images: dto.images ?? [],
      paymentPlanType: dto.paymentPlanType,
      downPaymentPct: dto.downPaymentPct,
      installmentDurationMonths: dto.installmentDurationMonths ?? [],
    });
    return toListingSummary(listing);
  }

  async findMine(agencyId: string) {
    const listings = await this.listingModel
      .find({ agencyId })
      .sort({ createdAt: -1 });
    return listings.map(toListingSummary);
  }

  async updateMine(
    agencyId: string,
    id: string,
    dto: UpdateMarketplaceListingDto,
  ) {
    const listing = await this.getOwned(agencyId, id);
    if (!EDITABLE_STATUSES.includes(listing.status)) {
      throw new ConflictException(
        'Only active or under-offer listings can be edited',
      );
    }

    if (dto.title !== undefined) listing.title = dto.title;
    if (dto.location !== undefined) listing.location = dto.location;
    if (dto.description !== undefined) listing.description = dto.description;
    if (dto.price !== undefined) listing.price = dto.price;
    if (dto.bedrooms !== undefined) listing.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) listing.bathrooms = dto.bathrooms;
    if (dto.sizeSqm !== undefined) listing.sizeSqm = dto.sizeSqm;
    if (dto.images !== undefined) listing.images = dto.images;
    if (dto.paymentPlanType !== undefined)
      listing.paymentPlanType = dto.paymentPlanType;
    if (dto.downPaymentPct !== undefined)
      listing.downPaymentPct = dto.downPaymentPct;
    if (dto.installmentDurationMonths !== undefined)
      listing.installmentDurationMonths = dto.installmentDurationMonths;

    assertInstallmentFieldsValid(
      listing.paymentPlanType,
      listing.downPaymentPct,
      listing.installmentDurationMonths,
    );

    await listing.save();
    return toListingSummary(listing);
  }

  async withdraw(agencyId: string, id: string) {
    const listing = await this.getOwned(agencyId, id);
    if (!EDITABLE_STATUSES.includes(listing.status)) {
      throw new ConflictException(
        'Only active or under-offer listings can be withdrawn',
      );
    }
    listing.status = 'WITHDRAWN';
    await listing.save();
    return toListingSummary(listing);
  }

  async markSold(agencyId: string, id: string) {
    const listing = await this.getOwned(agencyId, id);
    if (listing.status !== 'UNDER_OFFER') {
      throw new ConflictException(
        'Only listings under offer can be marked sold',
      );
    }
    listing.status = 'SOLD';
    await listing.save();
    return toListingSummary(listing);
  }

  async findFull(session: { id: string; role: SessionRole }, id: string) {
    const listing = await this.listingModel.findById(id);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (
      session.role === 'AGENCY' &&
      listing.agencyId.toString() !== session.id
    ) {
      throw new ForbiddenException('Not your listing');
    }
    const offers = await this.offerModel
      .find({ listingId: listing._id })
      .sort({ createdAt: -1 });
    return {
      listing: toListingSummary(listing),
      offers: offers.map(toOfferSummary),
    };
  }

  async findPublicList() {
    const listings = await this.listingModel
      .find({ status: 'ACTIVE' })
      .sort({ createdAt: -1 });
    return listings.map(toListingSummary);
  }

  async findPublicById(id: string) {
    const listing = await this.listingModel.findById(id);
    if (!listing || listing.status === 'WITHDRAWN') {
      throw new NotFoundException('Listing not found');
    }
    return toListingSummary(listing);
  }

  async acceptOffer(agencyId: string, listingId: string, offerId: string) {
    const listing = await this.getOwned(agencyId, listingId);
    if (listing.status !== 'ACTIVE') {
      throw new ConflictException(
        'Only active listings can have an offer accepted',
      );
    }
    const offer = await this.getOwnedPendingOffer(listing, offerId);

    offer.status = 'ACCEPTED';
    offer.respondedAt = new Date();
    await offer.save();

    await this.offerModel.updateMany(
      { listingId: listing._id, status: 'PENDING', _id: { $ne: offer._id } },
      { status: 'REJECTED', respondedAt: new Date() },
    );

    listing.status = 'UNDER_OFFER';
    await listing.save();

    return toOfferSummary(offer);
  }

  async rejectOffer(agencyId: string, listingId: string, offerId: string) {
    const listing = await this.getOwned(agencyId, listingId);
    const offer = await this.getOwnedPendingOffer(listing, offerId);

    offer.status = 'REJECTED';
    offer.respondedAt = new Date();
    await offer.save();

    return toOfferSummary(offer);
  }

  private async getOwned(agencyId: string, id: string) {
    const listing = await this.listingModel.findById(id);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.agencyId.toString() !== agencyId) {
      throw new ForbiddenException('Not your listing');
    }
    return listing;
  }

  private async getOwnedPendingOffer(
    listing: MarketplaceListingDocument,
    offerId: string,
  ) {
    const offer = await this.offerModel.findById(offerId);
    if (!offer || offer.listingId.toString() !== listing._id.toString()) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.status !== 'PENDING') {
      throw new ConflictException('Only pending offers can be responded to');
    }
    return offer;
  }
}
