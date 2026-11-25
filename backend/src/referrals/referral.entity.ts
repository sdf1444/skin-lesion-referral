import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Features, Urgency } from './referral.types';

// Contains patient-identifiable data: encrypt at rest and restrict access in any real deployment.
@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
