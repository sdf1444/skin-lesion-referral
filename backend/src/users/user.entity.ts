import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Role } from './roles';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 254, unique: true })
  email!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: Role;

  @Column({ length: 100 })
  passwordHash!: string;

  // Incremented on sign-out to invalidate every token issued before it.
  @Column({ type: 'int', unsigned: true, default: 0 })
  tokenVersion!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
