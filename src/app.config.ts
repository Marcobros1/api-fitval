import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import helmet from 'helmet';
import { AbstractHttpAdapter } from '@nestjs/core';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(helmet());

  // trust proxy para que el rate limiter funcione detrás de proxy (Render, nginx, etc.)
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance() as AbstractHttpAdapter & { set: (key: string, value: number) => void };
  instance.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
