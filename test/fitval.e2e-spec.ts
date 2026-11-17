import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.config';
import { AppModule } from '../src/app.module';

describe('API de FitVal (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgres://alumno:alumno_dev_123@localhost:5433/fitval';
    process.env.JWT_SECRET = 'secreto-solo-para-tests-e2e';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    pool = app.get(Pool);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it('GET /api/health responde 200', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'fitval' });
  });

  it('GET /api/classes devuelve 200 y un array', async () => {
    const response = await request(app.getHttpServer()).get('/api/classes');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/classes/abc devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/api/classes/abc');
    expect(response.status).toBe(400);
  });

  it('GET /api/classes/999999 devuelve 404', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/classes/999999',
    );
    expect(response.status).toBe(404);
  });

  it('POST /api/classes sin token devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/classes')
      .send({
        activity: 'Fuerza',
        room: 'Sala 3',
        startsAt: '2026-11-10T18:00:00Z',
        spots: 15,
        trainerId: 4,
      });
    expect(response.status).toBe(401);
  });

  it('POST /api/auth/login con contraseña mal devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'noexiste@gym.com', password: '12345678' });
    expect(response.status).toBe(401);
  });

  it('POST /api/classes con token de socio devuelve 403', async () => {
    const email = `test-${Date.now()}@fitval.com`;

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: '12345678' });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: '12345678' });

    const token = (login.body as { accessToken: string }).accessToken;

    const response = await request(app.getHttpServer())
      .post('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        activity: 'Fuerza',
        room: 'Sala 3',
        startsAt: '2026-11-10T18:00:00Z',
        spots: 15,
        trainerId: 4,
      });

    expect(response.status).toBe(403);
  });
});
