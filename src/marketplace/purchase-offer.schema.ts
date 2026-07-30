import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PurchaseOfferDocument = HydratedDocument<PurchaseOffer>;

export type PurchaseOfferStatus =
  'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type OfferPaymentPlan = 'FULL_PAYMENT' | 'INSTALLMENT';

@Schema({ timestamps: true })
export class PurchaseOffer {
  @Prop({
    type: Types.ObjectId,
    ref: 'MarketplaceListing',
    required: true,
    index: true,
  })
  listingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Investor', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ enum: ['FULL_PAYMENT', 'INSTALLMENT'], required: true })
  paymentPlan: OfferPaymentPlan;

  @Prop({ type: Number })
  downPaymentPct?: number | null;

  @Prop({ type: Number })
  installmentDurationMonths?: number | null;

  @Prop({ required: true, min: 0 })
  offerAmount: number;

  @Prop({ type: String })
  message?: string | null;

  @Prop({
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
    default: 'PENDING',
  })
  status: PurchaseOfferStatus;

  @Prop({ type: Date })
  respondedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PurchaseOfferSchema = SchemaFactory.createForClass(PurchaseOffer);
PurchaseOfferSchema.index({ listingId: 1, status: 1 });
