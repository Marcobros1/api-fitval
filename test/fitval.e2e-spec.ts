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

  it('GET /api/v1/health responde 200', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'fitval' });
  });

  it('GET /api/v1/classes devuelve 200 y un array', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/classes');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/v1/classes/abc devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/classes/abc',
    );
    expect(response.status).toBe(400);
  });

  it('GET /api/v1/classes/999999 devuelve 404', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/classes/999999',
    );
    expect(response.status).toBe(404);
  });

  it('POST /api/v1/classes sin token devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .send({
        activity: 'Fuerza',
        room: 'Sala 3',
        startsAt: '2026-11-10T18:00:00Z',
        spots: 15,
        trainerId: 4,
      });
    expect(response.status).toBe(401);
  });

  it('POST /api/v1/auth/login con contraseña mal devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'noexiste@gym.com', password: '12345678' });
    expect(response.status).toBe(401);
  });

  it('POST /api/v1/classes con token de socio devuelve 403', async () => {
    const email = `test-${Date.now()}@fitval.com`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: '12345678' });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: '12345678' });

    const token = (login.body as { accessToken: string }).accessToken;

    const response = await request(app.getHttpServer())
      .post('/api/v1/classes')
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

  // Tests para v2 - paginación
  describe('GET /api/v2/classes (paginación)', () => {
    it('GET /api/v2/classes?page=1&limit=3 trae 3 clases en data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/classes')
        .query({ page: 1, limit: 3 });

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(Array.isArray(response.body.data)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data.length).toBe(3);

      expect(response.body).toHaveProperty('total');

      expect(response.body).toHaveProperty('totalPages');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.page).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.limit).toBe(3);
    });

    it('GET /api/v2/classes?limit=100 responde 400', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/classes')
        .query({ limit: 100 });

      expect(response.status).toBe(400);
    });

    it('GET /api/v2/classes?page=0 responde 400', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/classes')
        .query({ page: 0 });

      expect(response.status).toBe(400);
    });

    it('GET /api/v2/classes?sort=price responde 400', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/classes')
        .query({ sort: 'price' });

      expect(response.status).toBe(400);
    });

    it('GET /api/v2/classes?order=up responde 400', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/classes')
        .query({ order: 'up' });

      expect(response.status).toBe(400);
    });
  });
});
