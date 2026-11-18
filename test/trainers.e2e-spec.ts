import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

// Usuarios de prueba con correo único por ejecución
const RUN_ID = Date.now();
const STAFF_EMAIL = `staff-trainers-${RUN_ID}@gym.com`;
const MEMBER_EMAIL = `member-trainers-${RUN_ID}@gym.com`;
const PASSWORD = '12345678';

// Un monitor válido. El DNI y el correo cambian en cada ejecución: así no chocan
// con lo que haya quedado de otras pruebas (si no, un 409 taparía el 400 que se quiere probar)
const VALID_BODY = {
  dni: `8${String(RUN_ID).slice(-8)}`,
  name: 'Nuria Prieto',
  email: `nuria-${RUN_ID}@gym.com`,
  specialtyIds: [2, 4],
};

describe('Trainers (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let staffToken: string;
  let memberToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgres://alumno:alumno_dev_123@localhost:5433/fitval';
    process.env.JWT_SECRET = 'secreto-solo-para-tests-e2e';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    pool = moduleFixture.get(Pool);
    await app.init();

    // El staff se hace staff por SQL: la API no deja elegir el rol al registrarse
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: STAFF_EMAIL, password: PASSWORD });
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: MEMBER_EMAIL, password: PASSWORD });
    await pool.query("UPDATE users SET role = 'staff' WHERE email = $1", [
      STAFF_EMAIL,
    ]);

    staffToken = await loginAs(STAFF_EMAIL);
    memberToken = await loginAs(MEMBER_EMAIL);
  });

  afterAll(async () => {
    // Borra solo lo que creó este archivo: el monitor de prueba y los usuarios
    await pool.query(
      'DELETE FROM trainer_specialties WHERE trainer_id IN (SELECT id FROM trainers WHERE dni = $1)',
      [VALID_BODY.dni],
    );
    await pool.query('DELETE FROM trainers WHERE dni = $1', [VALID_BODY.dni]);
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [
      [STAFF_EMAIL, MEMBER_EMAIL],
    ]);
    await pool.end();
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD });
    return (response.body as { accessToken: string }).accessToken;
  }

  describe('GET /api/v1/trainers/:id', () => {
    it('devuelve 200 con el monitor y sus especialidades, sin el DNI', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/trainers/1',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Carla Navarro',
        email: 'carla@gym.com',
        specialties: ['Ciclo indoor', 'Fuerza'],
      });
    });

    it('devuelve 400 si el id no es un número', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/trainers/abc',
      );

      expect(response.status).toBe(400);
    });

    it('devuelve 404 si el monitor no existe', async () => {
      // Un id que no existe ahora mismo: el mayor de la tabla + 1
      const { rows } = await pool.query<{ next: number }>(
        'SELECT COALESCE(MAX(id), 0) + 1 AS next FROM trainers',
      );
      const response = await request(app.getHttpServer()).get(
        `/api/v1/trainers/${rows[0].next}`,
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/trainers', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .send(VALID_BODY);

      expect(response.status).toBe(401);
    });

    it('devuelve 403 si el token es de un socio', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(VALID_BODY);

      expect(response.status).toBe(403);
    });

    it('devuelve 400 si specialtyIds llega vacío', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, specialtyIds: [] });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si specialtyIds tiene ids repetidos', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, specialtyIds: [2, 2] });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si el DNI no tiene 9 caracteres', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, dni: '123' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si una especialidad no existe y no guarda al monitor', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, specialtyIds: [2, 99] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'No existe la especialidad 99',
      );

      const saved = await pool.query('SELECT id FROM trainers WHERE dni = $1', [
        VALID_BODY.dni,
      ]);
      expect(saved.rows).toHaveLength(0);
    });

    it('devuelve 201 con el monitor creado y sus especialidades', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(VALID_BODY);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number) as number,
        name: VALID_BODY.name,
        email: VALID_BODY.email,
        specialties: ['Yoga', 'Baile'], // orden por specialties.id: 2 y luego 4
      });
    });

    it('devuelve 409 si el DNI ya existe', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(VALID_BODY);

      expect(response.status).toBe(409);
    });
  });
});
