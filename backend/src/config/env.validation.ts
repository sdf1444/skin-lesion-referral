import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvVars {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  DB_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 3306;

  @IsString()
  DB_USER: string = 'referral';

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_NAME: string = 'referral';

  // Comma-separated list of allowed browser origins.
  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:5173';

  // Auto-create/alter tables from entities. Convenient locally; use migrations in production.
  @IsIn(['true', 'false'])
  DB_SYNCHRONIZE: string = 'false';

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsInt()
  @Min(60)
  JWT_TTL_SECONDS: number = 28800;

  // Set to "true" whenever the site is served over HTTPS.
  @IsIn(['true', 'false'])
  COOKIE_SECURE: string = 'false';

  // Creates one demo user per role on startup. Never enable in production.
  @IsIn(['true', 'false'])
  SEED_DEMO_USERS: string = 'false';

  // Number of reverse proxies in front of the API (e.g. 1 behind nginx), so the real client IP
  // is used for rate limiting. Leave at 0 when clients connect directly.
  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY_HOPS: number = 0;

  @IsOptional()
  @IsString()
  @MinLength(8)
  DEMO_PASSWORD?: string;
}

export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const env = plainToInstance(EnvVars, raw, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment: ${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ')}`,
    );
  }
  if (env.SEED_DEMO_USERS === 'true' && !env.DEMO_PASSWORD) {
    throw new Error(
      'Invalid environment: DEMO_PASSWORD is required when SEED_DEMO_USERS=true',
    );
  }
  if (env.SEED_DEMO_USERS === 'true' && env.NODE_ENV === 'production') {
    throw new Error(
      'Invalid environment: SEED_DEMO_USERS must not be enabled in production',
    );
  }
  return env;
}
