import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
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
  return env;
}
