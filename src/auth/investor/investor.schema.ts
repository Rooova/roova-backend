import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InvestorDocument = HydratedDocument<Investor>;

export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

@Schema({ timestamps: true })
export class Investor {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' })
  kycStatus: KycStatus;

  @Prop({ type: String, unique: true, sparse: true })
  passwordResetTokenHash?: string | null;

  @Prop({ type: Date })
  passwordResetExpiresAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InvestorSchema = SchemaFactory.createForClass(Investor);
