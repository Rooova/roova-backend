import { IsNumber, IsPositive } from 'class-validator';

export class CreateDepositDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}
