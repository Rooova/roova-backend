import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DepositDocument = HydratedDocument<Deposit>;

export type DepositStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'MISMATCHED';

@Schema({ timestamps: true })
export class Deposit {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Investor',
    required: true,
    index: true,
  })
  investorId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amountKobo: number;

  @Prop({ required: true, unique: true })
  reference: string;

  @Prop({
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'MISMATCHED'],
    default: 'PENDING',
  })
  status: DepositStatus;

  @Prop({ type: String })
  paystackAccessCode?: string | null;

  @Prop({ type: Date })
  verifiedAt?: Date | null;

  @Prop({ type: MongooseSchema.Types.Mixed })
  providerMetadata?: unknown;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DepositSchema = SchemaFactory.createForClass(Deposit);
