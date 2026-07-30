import {
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MinLength,
} from 'class-validator';
import { PropertyTier } from '../property.schema';

export class CreatePropertyDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(2)
  location: string;

  @IsIn(['Gold tier', 'Silver tier'])
  tier: PropertyTier;

  @IsNumber()
  @IsPositive()
  target: number;

  @IsNumber()
  @IsPositive()
  sharePrice: number;

  @IsNumber()
  @IsPositive()
  @Max(100)
  yieldPct: number;

  @IsInt()
  @IsPositive()
  daysRemaining: number;
}
