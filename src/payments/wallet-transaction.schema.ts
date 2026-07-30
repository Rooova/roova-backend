import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type WalletTransactionDocument = HydratedDocument<WalletTransaction>;

export type WalletTransactionType = 'DEPOSIT' | 'INVEST' | 'REFUND';

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Wallet', required: true })
  walletId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Investor',
    required: true,
    index: true,
  })
  investorId: Types.ObjectId;

  @Prop({ enum: ['DEPOSIT', 'INVEST', 'REFUND'], required: true })
  type: WalletTransactionType;

  @Prop({ required: true, min: 1 })
  amountKobo: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Deposit' })
  depositId?: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Investment' })
  investmentId?: Types.ObjectId | null;

  @Prop({ type: Number })
  availableBalanceKoboAfter?: number | null;

  @Prop({ type: Number })
  escrowedBalanceKoboAfter?: number | null;

  createdAt?: Date;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);

WalletTransactionSchema.index(
  { depositId: 1 },
  { unique: true, partialFilterExpression: { depositId: { $exists: true } } },
);
WalletTransactionSchema.index(
  { investmentId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { investmentId: { $exists: true } },
  },
);
