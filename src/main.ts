import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

process.loadEnvFile(); // lee el .env y guarda sus valores en process.env

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
