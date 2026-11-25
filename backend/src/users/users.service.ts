import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import type { EnvVars } from '../config/env.validation';
import type { Role } from './roles';
import { User } from './user.entity';

export const BCRYPT_COST = 12;

const DEMO_USERS: Array<{ email: string; name: string; role: Role }> = [
  { email: 'referrer@example.com', name: 'Dr Alex Referrer', role: 'referrer' },
  {
    email: 'specialist@example.com',
    name: 'Dr Sam Specialist',
    role: 'specialist',
  },
  { email: 'admin@example.com', name: 'Ada Admin', role: 'admin' },
];

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  async revokeTokens(id: string): Promise<void> {
    await this.repo.increment({ id }, 'tokenVersion', 1);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.getOrThrow<string>('SEED_DEMO_USERS') !== 'true') return;
    const passwordHash = await this.hash(
      this.config.getOrThrow<string>('DEMO_PASSWORD'),
    );
    for (const u of DEMO_USERS) {
      if (!(await this.findByEmail(u.email))) {
        await this.repo.save(this.repo.create({ ...u, passwordHash }));
        this.logger.warn(`Seeded demo user ${u.email} (${u.role})`);
      }
    }
  }
}
