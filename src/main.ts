import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

// En tu ordenador, lee el .env. En Render no hay .env: las variables las pone Render.
if (existsSync('.env')) process.loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  app.useGlobalFilters(new AllExceptionsFilter());

  // Las fotos se sirven tal cual: /uploads/<nombre>
  app.useStaticAssets('uploads', { prefix: '/uploads' });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API de FitVal')
    .setDescription(
      'API del gimnasio FitVal con registro, login, clases, monitores y especialidades',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
