import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentPlanType } from '../marketplace-listing.schema';

export class CreateMarketplaceListingDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(2)
  location: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsInt()
  @Min(0)
  bedrooms: number;

  @IsInt()
  @Min(0)
  bathrooms: number;

  @IsNumber()
  @IsPositive()
  sizeSqm: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsIn(['FULL_PAYMENT', 'INSTALLMENT', 'BOTH'])
  paymentPlanType: PaymentPlanType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  downPaymentPct?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  installmentDurationMonths?: number[];
}
