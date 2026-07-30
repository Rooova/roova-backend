import {
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OfferPaymentPlan } from '../purchase-offer.schema';

export class CreatePurchaseOfferDto {
  @IsMongoId()
  listingId: string;

  @IsIn(['FULL_PAYMENT', 'INSTALLMENT'])
  paymentPlan: OfferPaymentPlan;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  downPaymentPct?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  installmentDurationMonths?: number;

  @IsNumber()
  @IsPositive()
  offerAmount: number;

  @IsOptional()
  @IsString()
  message?: string;
}
