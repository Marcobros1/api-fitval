import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createUser,
  loginAs,
  startApp,
} from './helpers/app.helper';

// Usuarios de prueba con correo único por ejecución
const RUN_ID = Date.now();
const STAFF_EMAIL = `staff-trainers-${RUN_ID}@gym.com`;
const MEMBER_EMAIL = `member-trainers-${RUN_ID}@gym.com`;

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
    ({ app, pool } = await startApp());

    await createUser(app, pool, STAFF_EMAIL, true);
    await createUser(app, pool, MEMBER_EMAIL);

    staffToken = await loginAs(app, STAFF_EMAIL);
    memberToken = await loginAs(app, MEMBER_EMAIL);
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

  // POST /api/v1/trainers con un token (o sin él, si token es undefined)
  function postTrainer(body: unknown, token?: string) {
    const req = request(app.getHttpServer()).post('/api/v1/trainers');
    return (token ? req.set('Authorization', `Bearer ${token}`) : req).send(
      body as object,
    );
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
      const response = await postTrainer(VALID_BODY);

      expect(response.status).toBe(401);
    });

    it('devuelve 403 si el token es de un socio', async () => {
      const response = await postTrainer(VALID_BODY, memberToken);

      expect(response.status).toBe(403);
    });

    it.each([
      ['specialtyIds llega vacío', { specialtyIds: [] }],
      ['specialtyIds tiene ids repetidos', { specialtyIds: [2, 2] }],
      ['el DNI no tiene 9 caracteres', { dni: '123' }],
    ])('devuelve 400 si %s', async (_motivo, cambio) => {
      const response = await postTrainer(
        { ...VALID_BODY, ...cambio },
        staffToken,
      );

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si una especialidad no existe y no guarda al monitor', async () => {
      const response = await postTrainer(
        { ...VALID_BODY, specialtyIds: [2, 99] },
        staffToken,
      );

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
      const response = await postTrainer(VALID_BODY, staffToken);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number) as number,
        name: VALID_BODY.name,
        email: VALID_BODY.email,
        specialties: ['Yoga', 'Baile'], // orden por specialties.id: 2 y luego 4
      });
    });

    it('devuelve 409 si el DNI ya existe', async () => {
      const response = await postTrainer(VALID_BODY, staffToken);

      expect(response.status).toBe(409);
    });
  });
});
