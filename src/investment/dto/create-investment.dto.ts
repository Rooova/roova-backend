import { IsInt, IsMongoId, IsPositive } from 'class-validator';

export class CreateInvestmentDto {
  @IsMongoId()
  propertyId: string;

  @IsInt()
  @IsPositive()
  shares: number;
}
