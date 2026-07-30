import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MarketplaceListingDocument = HydratedDocument<MarketplaceListing>;

export type MarketplaceListingStatus =
  | 'ACTIVE'
  | 'UNDER_OFFER'
  | 'SOLD'
  | 'WITHDRAWN';

export type PaymentPlanType = 'FULL_PAYMENT' | 'INSTALLMENT' | 'BOTH';

@Schema({ timestamps: true })
export class MarketplaceListing {
  @Prop({ type: Types.ObjectId, ref: 'Agency', required: true, index: true })
  agencyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ type: String })
  description?: string | null;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  bedrooms: number;

  @Prop({ required: true, min: 0 })
  bathrooms: number;

  @Prop({ required: true, min: 0 })
  sizeSqm: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({
    enum: ['ACTIVE', 'UNDER_OFFER', 'SOLD', 'WITHDRAWN'],
    default: 'ACTIVE',
    index: true,
  })
  status: MarketplaceListingStatus;

  @Prop({
    enum: ['FULL_PAYMENT', 'INSTALLMENT', 'BOTH'],
    default: 'FULL_PAYMENT',
  })
  paymentPlanType: PaymentPlanType;

  @Prop({ type: Number })
  downPaymentPct?: number | null;

  @Prop({ type: [Number], default: [] })
  installmentDurationMonths: number[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const MarketplaceListingSchema =
  SchemaFactory.createForClass(MarketplaceListing);
