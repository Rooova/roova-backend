import { IsInt, IsMongoId, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateInvestmentDto {
  @IsMongoId()
  propertyId: string;

  @IsInt()
  @IsPositive()
  shares: number;

  @IsOptional()
  @IsString()
  clientReference?: string;
}
