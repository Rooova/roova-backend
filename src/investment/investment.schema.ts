import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type InvestmentDocument = HydratedDocument<Investment>;

export type InvestmentStatus =
  'PENDING' | 'CONFIRMED' | 'REFUNDED' | 'CANCELLED';

@Schema({ timestamps: true })
export class Investment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Investor',
    required: true,
    index: true,
  })
  investorId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  propertyId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  shares: number;

  @Prop({ required: true, min: 0 })
  pricePerShare: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({
    enum: ['PENDING', 'CONFIRMED', 'REFUNDED', 'CANCELLED'],
    default: 'CONFIRMED',
  })
  status: InvestmentStatus;

  @Prop({ type: Date })
  refundedAt?: Date | null;

  @Prop({ type: String })
  clientReference?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InvestmentSchema = SchemaFactory.createForClass(Investment);
InvestmentSchema.index({ propertyId: 1, status: 1 });
InvestmentSchema.index(
  { investorId: 1, clientReference: 1 },
  {
    unique: true,
    partialFilterExpression: { clientReference: { $exists: true } },
  },
);
