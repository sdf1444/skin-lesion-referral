import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import type { Features, Urgency } from './referral.types';
import type { Status } from './workflow';

// Contains patient-identifiable data: encrypt at rest and restrict access in any real deployment.
@Entity('referrals')
@Index(['createdById', 'idempotencyKey'], { unique: true })
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'submitted' })
  status!: Status;

  @Column({
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  statusUpdatedAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  createdBy!: User;

  @Column({ type: 'char', length: 36 })
  createdById!: string;

  // Client-generated key making POSTs safe to retry; unique per creating user.
  @Column({ type: 'varchar', length: 64 })
  idempotencyKey!: string;

  // Fingerprint of the original request, to reject a reused key with a different payload.
  @Column({ type: 'char', length: 64 })
  requestHash!: string;

  @Column({ length: 100 })
  patientName!: string;

  @Column({ type: 'tinyint', unsigned: true })
  patientAge!: number;

  @Column({ length: 100 })
  site!: string;

  @Column({ length: 100 })
  referrerName!: string;

  @Column({ type: 'json' })
  features!: Features;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  score!: number;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  urgency!: Urgency;

  @Column({ type: 'json' })
  factors!: string[];

  @Column({ length: 50 })
  model!: string;

  // Image metadata only; the photo itself is not persisted.
  @Column({ length: 100 })
  imageFilename!: string;

  @Column({ length: 20 })
  imageMimeType!: string;

  @Column({ type: 'int', unsigned: true })
  imageBytes!: number;

  @Column({ type: 'text' })
  letter!: string;

  @Index()
  @CreateDateColumn()
  createdAt!: Date;
}
