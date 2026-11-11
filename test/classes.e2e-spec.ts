import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

describe('Classes (e2e)', () => {
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
    pool = moduleFixture.get(Pool);
    await app.init();
  });

  afterEach(async () => {
    await pool.end();
    await app.close();
  });

  it('GET /api/classes devuelve 200 con las clases de la base de datos', async () => {
    const response = await request(app.getHttpServer()).get('/api/classes');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('trainerName');
  });

  it('POST /api/classes crea una clase y devuelve 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/classes')
      .send({
        activity: 'Test E2E',
        room: 'Sala 1',
        startsAt: '2026-12-01T10:00:00Z',
        spots: 5,
        trainerId: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.activity).toBe('Test E2E');
    expect(response.body.trainerName).toBe('Carla Navarro');
  });

  it('POST /api/classes con monitor inexistente devuelve 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/classes')
      .send({
        activity: 'Test E2E',
        room: 'Sala 1',
        startsAt: '2026-12-01T10:00:00Z',
        spots: 5,
        trainerId: 99999,
      });

    expect(response.status).toBe(400);
  });
});
