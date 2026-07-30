import { MarketplaceListingDocument } from './marketplace-listing.schema';
import { PurchaseOfferDocument } from './purchase-offer.schema';

export function toListingSummary(listing: MarketplaceListingDocument) {
  return {
    id: listing._id.toString(),
    agencyId: listing.agencyId.toString(),
    title: listing.title,
    location: listing.location,
    description: listing.description ?? null,
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sizeSqm: listing.sizeSqm,
    images: listing.images,
    status: listing.status,
    paymentPlanType: listing.paymentPlanType,
    downPaymentPct: listing.downPaymentPct ?? null,
    installmentDurationMonths: listing.installmentDurationMonths,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export function toOfferSummary(offer: PurchaseOfferDocument) {
  return {
    id: offer._id.toString(),
    listingId: offer.listingId.toString(),
    buyerId: offer.buyerId.toString(),
    paymentPlan: offer.paymentPlan,
    downPaymentPct: offer.downPaymentPct ?? null,
    installmentDurationMonths: offer.installmentDurationMonths ?? null,
    offerAmount: offer.offerAmount,
    message: offer.message ?? null,
    status: offer.status,
    respondedAt: offer.respondedAt ?? null,
    createdAt: offer.createdAt,
  };
}
