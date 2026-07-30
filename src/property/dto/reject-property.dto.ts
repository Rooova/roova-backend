import { IsString, MinLength } from 'class-validator';

export class RejectPropertyDto {
  @IsString()
  @MinLength(3)
  reason: string;
}
