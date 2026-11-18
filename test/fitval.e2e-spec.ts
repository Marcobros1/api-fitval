import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

const VALID_TRAINER = {
  dni: '88888888X',
  name: 'Monitor E2E',
  email: 'monitor-e2e@gym.com',
  specialtyIds: [{ id: 2 }, { id: 3 }],
};

// Usuarios de prueba con correo único por ejecución
const RUN_ID = Date.now();
const STAFF_EMAIL = `staff-e2e-${RUN_ID}@gym.com`;
const MEMBER_EMAIL = `member-e2e-${RUN_ID}@gym.com`;
const PASSWORD = '12345678';

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
  });

  afterAll(async () => {
    // Limpieza: borrar usuarios y monitores creados en los tests
    await pool.query('DELETE FROM trainer_specialties WHERE trainer_id > 4');
    await pool.query('DELETE FROM trainers WHERE id > 4');
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

  async function registerTrainer(
    token: string,
    body: typeof VALID_TRAINER,
  ): Promise<{ status: number; body: unknown }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    return { status: response.status, body: response.body };
  }

  interface TrainerResponse {
    id: number;
    name: string;
    dni: string;
    email: string;
    specialties: string[];
  }

  describe('GET /api/v1/trainers/:id', () => {
    it('devuelve 200 y el monitor con sus especialidades', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/trainers/1',
      );

      expect(response.status).toBe(200);
      const body = response.body as TrainerResponse;
      expect(body).toMatchObject({
        id: 1,
        name: 'Carla Navarro',
        dni: '90000001J',
        email: 'carla@gym.com',
      });
      expect(Array.isArray(body.specialties)).toBe(true);
      expect(body.specialties).toContain('Ciclo indoor');
      expect(body.specialties).toContain('Fuerza');
    });

    it('devuelve 200 y el monitor con una especialidad', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/trainers/4',
      );

      expect(response.status).toBe(200);
      const body = response.body as TrainerResponse;
      expect(body.name).toBe('Rubén Castro');
      expect(body.specialties).toEqual(['Fuerza']);
    });

    it('devuelve 404 si el monitor no existe', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/trainers/999999',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/trainers', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .send(VALID_TRAINER);

      expect(response.status).toBe(401);
    });

    it('devuelve 403 si el token es de un socio (member)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          ...VALID_TRAINER,
          dni: '77777777Z',
          email: 'nuevo-miembro@gym.com',
        });

      expect(response.status).toBe(403);
    });

    it('devuelve 201 y crea monitor con sus especialidades', async () => {
      const uniqueDni = `8888888${RUN_ID % 10}X`;
      const uniqueEmail = `monitor-e2e-${RUN_ID}@gym.com`;
      const response = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: uniqueDni,
        email: uniqueEmail,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Monitor E2E',
        dni: uniqueDni,
        email: uniqueEmail,
      });
      const body = response.body as TrainerResponse;
      expect(Array.isArray(body.specialties)).toBe(true);
      expect(body.specialties).toEqual(
        expect.arrayContaining(['Yoga', 'Pilates']),
      );
    });

    it('devuelve 400 si el DNI no tiene 9 caracteres', async () => {
      const { status } = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: '12345',
        email: 'dni-mal@gym.com',
      });

      expect(status).toBe(400);
    });

    it('devuelve 400 si no tiene especialidades', async () => {
      const { status } = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: '66666666Y',
        email: 'sin-especialidad@gym.com',
        specialtyIds: [],
      });

      expect(status).toBe(400);
    });

    it('devuelve 400 si las especialidades están repetidas', async () => {
      const { status } = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: '55555555W',
        email: 'especialidades-dup@gym.com',
        specialtyIds: [{ id: 1 }, { id: 1 }],
      });

      expect(status).toBe(400);
    });

    it('devuelve 400 si la especialidad no existe', async () => {
      const { status } = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: '44444444V',
        email: 'especialidad-no-existe@gym.com',
        specialtyIds: [{ id: 999 }],
      });

      expect(status).toBe(400);
    });

    it('devuelve 409 si el DNI ya existe', async () => {
      const { status } = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: '90000001J', // Carla Navarro
        email: 'dni-duplicado@gym.com',
      });

      expect(status).toBe(409);
    });

    it('devuelve 409 si el email ya existe', async () => {
      const { status } = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: '33333333U',
        email: 'carla@gym.com', // Carla Navarro
      });

      expect(status).toBe(409);
    });

    it('devuelve 400 si llegan campos extra (forbidNonWhitelisted)', async () => {
      const uniqueDni = `7777777${RUN_ID % 10}T`;
      const uniqueEmail = `filtro-e2e-${RUN_ID}@gym.com`;
      const { status } = await registerTrainer(staffToken, {
        ...VALID_TRAINER,
        dni: uniqueDni,
        email: uniqueEmail,
        id: 99999,
        password: 'hack',
      });

      expect(status).toBe(400);
    });
  });
});
