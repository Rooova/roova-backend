import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PropertyDocument = HydratedDocument<Property>;

export type PropertyTier = 'Gold tier' | 'Silver tier';

export type PropertyStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'LIVE'
  | 'REJECTED'
  | 'FUNDED'
  | 'CLOSED_UNFUNDED';

@Schema({ timestamps: true })
export class Property {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Agency',
    required: true,
    index: true,
  })
  agencyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ enum: ['Gold tier', 'Silver tier'], required: true })
  tier: PropertyTier;

  @Prop({
    enum: [
      'DRAFT',
      'PENDING_REVIEW',
      'LIVE',
      'REJECTED',
      'FUNDED',
      'CLOSED_UNFUNDED',
    ],
    default: 'DRAFT',
    index: true,
  })
  status: PropertyStatus;

  @Prop({ required: true, min: 0 })
  target: number;

  @Prop({ required: true, min: 0 })
  sharePrice: number;

  @Prop({ required: true, min: 0, max: 100 })
  yieldPct: number;

  @Prop({ default: 0, min: 0 })
  raised: number;

  @Prop({ default: 0, min: 0 })
  sharesSold: number;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Investor' }],
    default: [],
  })
  investorIds: Types.ObjectId[];

  @Prop({ default: 0, min: 0 })
  investors: number;

  @Prop({ type: Number })
  totalShares?: number | null;

  @Prop({ required: true, min: 1 })
  fundingWindowDays: number;

  @Prop({ type: Date })
  fundingDeadline?: Date | null;

  @Prop({ type: String })
  rejectionReason?: string | null;

  @Prop({ type: Date })
  reviewedAt?: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin' })
  reviewedBy?: Types.ObjectId | null;

  @Prop({ type: String })
  description?: string | null;

  @Prop({ type: [String], default: [] })
  images: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
PropertySchema.index({ status: 1, fundingDeadline: 1 });
