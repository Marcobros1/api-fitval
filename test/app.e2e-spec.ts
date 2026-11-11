import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  beforeEach(async () => {
    process.env.DATABASE_URL =
      'postgres://alumno:alumno_dev_123@localhost:5433/fitval';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    pool = moduleFixture.get(Pool);
    await app.init();
  });

  afterEach(async () => {
    await pool.end();
    await app.close();
  });

  it('GET /api/health devuelve 200 con estado de la API y la base de datos', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      database: 'fitval',
    });
  });
});
