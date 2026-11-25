import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { STATUSES, type Status } from '../workflow';

export class ListReferralsQuery {
  @IsOptional()
  @IsIn(STATUSES)
  status?: Status;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
