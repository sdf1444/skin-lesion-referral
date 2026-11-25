import { IsIn } from 'class-validator';
import { STATUSES, type Status } from '../workflow';

export class UpdateStatusDto {
  @IsIn(STATUSES)
  status!: Status;
}
