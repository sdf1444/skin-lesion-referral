import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import type { EnvVars } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);
  app.use(helmet());
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGINS')
      .split(',')
      .map((o) => o.trim()),
  });
  app.enableShutdownHooks();
  configureApp(app);
  const port = config.get<number>('PORT');
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}
void bootstrap();
