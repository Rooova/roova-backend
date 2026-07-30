import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MinLength,
} from 'class-validator';
import { PropertyTier } from '../property.schema';

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  location?: string;

  @IsOptional()
  @IsIn(['Gold tier', 'Silver tier'])
  tier?: PropertyTier;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  target?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sharePrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(100)
  yieldPct?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  daysRemaining?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
