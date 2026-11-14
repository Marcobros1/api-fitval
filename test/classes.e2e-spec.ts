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

    // Un miembro y un staff de prueba. El staff se hace staff por SQL
    // (la API no permite elegir el rol al registrarse)
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: STAFF_EMAIL, password: PASSWORD });
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: MEMBER_EMAIL, password: PASSWORD });
    await pool.query("UPDATE users SET role = 'staff' WHERE email = $1", [
      STAFF_EMAIL,
    ]);

    staffToken = await loginAs(STAFF_EMAIL);
    memberToken = await loginAs(MEMBER_EMAIL);

    // Crear la clase válida para las pruebas de DELETE
    const created = await request(app.getHttpServer())
      .post('/api/classes')
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
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    return (response.body as { accessToken: string }).accessToken;
  }

  describe('GET /api/classes', () => {
    it('devuelve 200 y las clases con el nombre del monitor', async () => {
      const response = await request(app.getHttpServer()).get('/api/classes');

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
        .get('/api/classes')
        .query({ activity: 'yoga' });

      expect(response.status).toBe(200);
      const classes = response.body as { activity: string }[];
      expect(classes).toHaveLength(2);
      expect(classes.every((c) => c.activity === 'Yoga')).toBe(true);
    });

    it('filtra por coincidencia parcial (SPIN)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/classes')
        .query({ activity: 'SPIN' });

      expect(response.status).toBe(200);
      const classes = response.body as { activity: string }[];
      expect(classes).toHaveLength(2);
      expect(classes.every((c) => c.activity === 'Spinning')).toBe(true);
    });

    it('no se deja inyectar SQL por el filtro', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/classes')
        .query({ activity: "zzz' OR 1=1 --" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/classes/:id', () => {
    it('devuelve 200 y la clase pedida', async () => {
      const response = await request(app.getHttpServer()).get('/api/classes/7');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 7,
        activity: 'Crossfit',
        spots: 3,
      });
    });

    it('devuelve 400 si el id no es un número', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/classes/abc',
      );

      expect(response.status).toBe(400);
    });

    it('devuelve 404 si la clase no existe', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/classes/99999',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/classes', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .send(VALID_BODY);

      expect(response.status).toBe(401);
    });

    it('devuelve 403 si el token es de un socio (member)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(VALID_BODY);

      expect(response.status).toBe(403);
    });

    it('devuelve 201 y la clase creada con el nombre del monitor', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(VALID_BODY);

      expect(response.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.trainerName).toBe('Rubén Castro');
    });

    it('devuelve 400 si spots es 0', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, spots: 0 });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si trainerId no existe', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, trainerId: 99 });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si startsAt no es una fecha ISO', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, startsAt: 'mañana' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si activity está en blanco', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, activity: '   ' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si llega un campo de más (id)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ...VALID_BODY, id: 1 });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/classes/:id', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/classes/${createdClassId}`,
      );

      expect(response.status).toBe(401);
    });

    it('devuelve 403 si el token es de un socio (member)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('devuelve 200 y la clase borrada', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.id).toBe(createdClassId);
    });

    it('devuelve 404 al borrar la misma clase otra vez', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(404);
    });

    it('devuelve 409 si la clase tiene reservas', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/classes/1')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(409);
    });
  });
});
