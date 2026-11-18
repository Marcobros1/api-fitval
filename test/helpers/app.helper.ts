import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.config';

export const PASSWORD = '12345678';

// Arranca la API entera con la misma configuración que main.ts
export async function startApp(): Promise<{
  app: INestApplication<App>;
  pool: Pool;
}> {
  process.env.DATABASE_URL =
    'postgres://alumno:alumno_dev_123@localhost:5433/fitval';
  process.env.JWT_SECRET = 'secreto-solo-para-tests-e2e';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  const pool = moduleFixture.get(Pool);
  await app.init();

  return { app, pool };
}

// Registra un usuario y, si se pide, lo convierte en staff por SQL
// (la API no deja elegir el rol al registrarse)
export async function createUser(
  app: INestApplication<App>,
  pool: Pool,
  email: string,
  asStaff = false,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: PASSWORD });

  if (asStaff) {
    await pool.query("UPDATE users SET role = 'staff' WHERE email = $1", [
      email,
    ]);
  }
}

// Inicia sesión y devuelve el token de acceso
export async function loginAs(
  app: INestApplication<App>,
  email: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  return (response.body as { accessToken: string }).accessToken;
}
