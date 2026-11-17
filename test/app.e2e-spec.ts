import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

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
    configureApp(app);
    pool = moduleFixture.get(Pool);
    await app.init();
  });

  afterEach(async () => {
    await pool.end();
    await app.close();
  });

  it('GET /api/v1/health devuelve 200 con estado de la API y la base de datos', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      database: 'fitval',
    });
  });
});
