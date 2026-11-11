import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

const VALID_BODY = {
  activity: 'Fuerza',
  room: 'Sala 3',
  startsAt: '2026-11-10T18:00:00Z',
  spots: 15,
  trainerId: 4,
};

describe('Classes (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let createdClassId: number;

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

    // Crear la clase válida para las pruebas de DELETE
    const created = await request(app.getHttpServer())
      .post('/api/classes')
      .send(VALID_BODY);
    createdClassId = created.body.id;
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  describe('POST /api/classes', () => {
    it('devuelve 201 y la clase creada con el nombre del monitor', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .send(VALID_BODY);

      expect(response.status).toBe(201);
      expect(response.body.trainerName).toBe('Rubén Castro');
    });

    it('devuelve 400 si spots es 0', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .send({ ...VALID_BODY, spots: 0 });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si trainerId no existe', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .send({ ...VALID_BODY, trainerId: 99 });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si startsAt no es una fecha ISO', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .send({ ...VALID_BODY, startsAt: 'mañana' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si activity está en blanco', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .send({ ...VALID_BODY, activity: '   ' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si llega un campo de más (id)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .send({ ...VALID_BODY, id: 1 });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/classes/:id', () => {
    it('devuelve 200 y la clase borrada', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/classes/${createdClassId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdClassId);
    });

    it('devuelve 404 al borrar la misma clase otra vez', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/classes/${createdClassId}`,
      );

      expect(response.status).toBe(404);
    });

    it('devuelve 409 si la clase tiene reservas', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/classes/1',
      );

      expect(response.status).toBe(409);
    });
  });
});
