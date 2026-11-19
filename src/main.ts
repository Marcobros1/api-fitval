import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

process.loadEnvFile(); // lee el .env y guarda sus valores en process.env

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  app.useGlobalFilters(new AllExceptionsFilter());

  // Las fotos se sirven tal cual: /uploads/<nombre>
  app.useStaticAssets('uploads', { prefix: '/uploads' });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API de FitVal')
    .setDescription('API del gimnasio FitVal con registro, login, clases, monitores y especialidades')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
