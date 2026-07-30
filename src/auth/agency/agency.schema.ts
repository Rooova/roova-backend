import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgencyDocument = HydratedDocument<Agency>;

export type AgencyStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

@Schema({ timestamps: true })
export class Agency {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'Silver tier' })
  tier: string;

  @Prop({ enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING' })
  status: AgencyStatus;

  @Prop({ type: String, unique: true, sparse: true })
  passwordResetTokenHash?: string | null;

  @Prop({ type: Date })
  passwordResetExpiresAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AgencySchema = SchemaFactory.createForClass(Agency);
