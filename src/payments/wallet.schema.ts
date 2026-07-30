import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Investor',
    required: true,
    unique: true,
    index: true,
  })
  investorId: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  availableBalanceKobo: number;

  @Prop({ default: 0, min: 0 })
  escrowedBalanceKobo: number;

  @Prop({ default: 'NGN' })
  currency: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
