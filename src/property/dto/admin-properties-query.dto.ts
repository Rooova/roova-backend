import { IsIn, IsOptional } from 'class-validator';
import type { PropertyStatus } from '../property.schema';

const STATUS_VALUES: PropertyStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'LIVE',
  'REJECTED',
  'FUNDED',
  'CLOSED_UNFUNDED',
];

export class AdminPropertiesQueryDto {
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: PropertyStatus;
}
