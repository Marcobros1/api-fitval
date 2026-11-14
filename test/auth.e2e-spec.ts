import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

// Correo único por ejecución: los tests no chocan con datos de antes
const EMAIL = `ana-e2e-${Date.now()}@gym.com`;
// Contraseña de prueba, tomada del entorno para no escribirla en el código
const PASSWORD = process.env.TEST_PASSWORD ?? 'test-password-local';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let token: string;

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
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [EMAIL]);
    await pool.end();
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('devuelve 201 con role member y sin contraseña ni hash', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number) as number,
        email: EMAIL,
        role: 'member',
      });
    });

    it('guarda un hash argon2 en la base de datos, no la contraseña', async () => {
      const result = await pool.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE email = $1',
        [EMAIL],
      );

      expect(result.rows[0].password_hash).not.toBe(PASSWORD);
      expect(result.rows[0].password_hash).toMatch(/^\$argon2/);
    });

    it('devuelve 409 si el correo ya está registrado', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(409);
    });

    it('devuelve 400 si el email no es válido', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'ana', password: PASSWORD });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si la contraseña tiene menos de 8 caracteres', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'luis-e2e@gym.com', password: '123' });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si llega un campo de más (role)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'luis-e2e@gym.com', password: PASSWORD, role: 'staff' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('devuelve 200 con un token que solo lleva el id', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(200);
      token = (response.body as { accessToken: string }).accessToken;
      expect(typeof token).toBe('string');

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      ) as Record<string, unknown>;
      expect(Object.keys(payload).sort((a, b) => a.localeCompare(b))).toEqual([
        'exp',
        'iat',
        'sub',
      ]);
      expect(Number(payload.exp) - Number(payload.iat)).toBe(3600);
    });

    it('devuelve 401 si la contraseña está mal', async () => {
      const invalidInput = 'xyz-wrong-pass-xyz';
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMAIL, password: invalidInput });

      expect(response.status).toBe(401);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.message).toBe('Correo o contraseña incorrectos');
    });

    it('devuelve 401 con el mismo mensaje si el correo no existe', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'noexiste-e2e@gym.com', password: PASSWORD });

      expect(response.status).toBe(401);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.message).toBe('Correo o contraseña incorrectos');
    });
  });

  describe('GET /api/auth/me', () => {
    it('devuelve 200 y los datos del usuario con su token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: expect.any(Number) as number,
        email: EMAIL,
        role: 'member',
      });
    });

    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('devuelve 401 si se cambia la última letra del token', async () => {
      const last = token.slice(-1);
      const tampered = token.slice(0, -1) + (last === 'A' ? 'B' : 'A');

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tampered}`);

      expect(response.status).toBe(401);
    });
  });
});
