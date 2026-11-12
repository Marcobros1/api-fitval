import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

describe('Plans (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  beforeAll(async () => {
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

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it('GET /api/plans devuelve 200 y los planes ordenados por precio', async () => {
    const response = await request(app.getHttpServer()).get('/api/plans');

    expect(response.status).toBe(200);
    const plans = response.body as { monthlyPrice: number }[];
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(typeof plan.monthlyPrice).toBe('number');
    }
    const prices = plans.map((plan) => plan.monthlyPrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
