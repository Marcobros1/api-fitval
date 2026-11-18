import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

const VALID_BODY = {
  activity: 'Fuerza',
  room: 'Sala 3',
  startsAt: '2026-11-10T18:00:00Z',
  spots: 15,
  trainerId: 4,
};

// Usuarios de prueba con correo único por ejecución
const RUN_ID = Date.now();
const STAFF_EMAIL = `staff-e2e-${RUN_ID}@gym.com`;
const MEMBER_EMAIL = `member-e2e-${RUN_ID}@gym.com`;
const PASSWORD = '12345678';

describe('Classes (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let staffToken: string;
  let memberToken: string;
  let createdClassId: number;

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

    // Un miembro y un staff de prueba. El staff se hace staff por SQL
    // (la API no permite elegir el rol al registrarse)
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

    // Crear la clase válida para las pruebas de DELETE
    const created = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(VALID_BODY);
    createdClassId = (created.body as { id: number }).id;
  });

  afterAll(async () => {
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

  describe('GET /api/v1/classes', () => {
    it('devuelve 200 y las clases con el nombre del monitor', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/classes',
      );

      expect(response.status).toBe(200);
      const classes = response.body as { id: number; trainerName: string }[];
      expect(classes[0]).toMatchObject({
        id: 1,
        activity: 'Spinning',
        trainerName: 'Carla Navarro',
      });
    });

    it('filtra por actividad sin distinguir mayúsculas (yoga)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/classes')
        .query({ activity: 'yoga' });

      expect(response.status).toBe(200);
      const classes = response.body as { activity: string }[];
      expect(classes).toHaveLength(2);
      expect(classes.every((c) => c.activity === 'Yoga')).toBe(true);
    });

    it('filtra por coincidencia parcial (SPIN)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/classes')
        .query({ activity: 'SPIN' });

      expect(response.status).toBe(200);
      const classes = response.body as { activity: string }[];
      expect(classes).toHaveLength(2);
      expect(classes.every((c) => c.activity === 'Spinning')).toBe(true);
    });

    it('no se deja inyectar SQL por el filtro', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/classes')
        .query({ activity: "zzz' OR 1=1 --" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/v1/classes/:id', () => {
    it('devuelve 200 y la clase pedida', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/classes/7',
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 7,
        activity: 'Crossfit',
        spots: 3,
      });
    });

    it('devuelve 400 si el id no es un número', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/classes/abc',
      );

      expect(response.status).toBe(400);
    });

    it('devuelve 404 si la clase no existe', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/classes/99999',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/classes', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .send(VALID_BODY);

      expect(response.status).toBe(401);
    });

    it('devuelve 403 si el token es de un socio (member)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(VALID_BODY);

      expect(response.status).toBe(403);
    });

    it('devuelve 201 y la clase creada con el nombre del monitor', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(VALID_BODY);

      expect(response.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.trainerName).toBe('Rubén Castro');
    });

    it('devuelve 400 si spots es 0', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, spots: 0 });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si trainerId no existe', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, trainerId: 99 });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si startsAt no es una fecha ISO', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, startsAt: 'mañana' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si activity está en blanco', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, activity: '   ' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si llega un campo de más (id)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, id: 1 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v2/classes (paginación)', () => {
    // Pide una página de la v2 con los parámetros de la consulta
    const getPage = (query: Record<string, unknown>) =>
      request(app.getHttpServer()).get('/api/v2/classes').query(query);

    it('devuelve 200 con 3 clases en data y los metadatos de la página', async () => {
      const response = await getPage({ page: 1, limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        page: 1,
        limit: 3,
        data: expect.any(Array) as unknown[],
      });
      const body = response.body as { data: unknown[]; total: number };
      expect(body.data).toHaveLength(3);
      expect(body.total).toBeGreaterThanOrEqual(3);
    });

    it.each([
      ['limit es mayor que 50', { limit: 100 }],
      ['page es 0', { page: 0 }],
      ['sort no está en la lista permitida', { sort: 'price' }],
      ['order no es asc ni desc', { order: 'up' }],
    ])('devuelve 400 si %s', async (_motivo, query) => {
      const response = await getPage(query);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/classes/:id', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/v1/classes/${createdClassId}`,
      );

      expect(response.status).toBe(401);
    });

    it('devuelve 403 si el token es de un socio (member)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('devuelve 200 y la clase borrada', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.id).toBe(createdClassId);
    });

    it('devuelve 404 al borrar la misma clase otra vez', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(404);
    });

    it('devuelve 409 si la clase tiene reservas', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/classes/1')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(409);
    });
  });
});
