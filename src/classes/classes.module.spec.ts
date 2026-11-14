import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { JwtService } from '@nestjs/jwt';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';

describe('Classes HTTP routes', () => {
  let app: INestApplication;
  let pool: { query: jest.Mock };

  beforeAll(async () => {
    pool = { query: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        ClassesService,
        { provide: Pool, useValue: pool },
        {
          provide: JwtService,
          useValue: { verifyAsync: () => Promise.resolve({ sub: 1 }) },
        },
        {
          provide: UsersService,
          useValue: {
            findById: () => Promise.resolve({ id: 1, role: 'staff' }),
          },
        },
        AuthGuard,
        StaffGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/classes', () => {
    it('devuelve 200 y las clases cuando la base de datos responde', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            activity: 'Spinning',
            room: 'Sala 1',
            starts_at: '2026-11-02T09:00:00.000Z',
            spots: 12,
            trainer_name: 'Carla Navarro',
          },
        ],
      });

      const response = await request(app.getHttpServer()).get('/api/classes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 1,
          activity: 'Spinning',
          room: 'Sala 1',
          startsAt: '2026-11-02T09:00:00.000Z',
          spots: 12,
          trainerName: 'Carla Navarro',
        },
      ]);
    });
  });

  describe('GET /api/classes?activity=', () => {
    it('filtra por actividad y devuelve 200', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            id: 2,
            activity: 'Yoga',
            room: 'Sala 2',
            starts_at: '2026-11-02T18:00:00.000Z',
            spots: 10,
            trainer_name: 'Javier Ortega',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/classes')
        .query({ activity: 'yoga' });

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body as any[]).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((response.body as any[])[0].activity).toBe('Yoga');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE $1'),
        ['%yoga%'],
      );
    });
  });

  describe('GET /api/classes/:id', () => {
    it('devuelve 200 y la clase buscada', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            id: 7,
            activity: 'Crossfit',
            room: 'Sala 3',
            starts_at: '2026-11-05T20:00:00.000Z',
            spots: 3,
            trainer_name: 'Carla Navarro',
          },
        ],
      });

      const response = await request(app.getHttpServer()).get('/api/classes/7');

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.id).toBe(7);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.activity).toBe('Crossfit');
    });

    it('devuelve 404 si la clase no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app.getHttpServer()).get(
        '/api/classes/99',
      );

      expect(response.status).toBe(404);
    });

    it('devuelve 409 si la clase tiene reservas', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ total: '3' }] });

      const response = await request(app.getHttpServer())
        .delete('/api/classes/1')
        .set('Authorization', 'Bearer cualquier-token');

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/classes', () => {
    const dto = {
      activity: 'Fuerza',
      room: 'Sala 3',
      startsAt: '2026-11-10T18:00:00Z',
      spots: 15,
      trainerId: 4,
    };

    it('devuelve 201 y la clase creada con el nombre del monitor', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 4 }] }) // trainers
        .mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              activity: 'Fuerza',
              room: 'Sala 3',
              starts_at: '2026-11-10T18:00:00.000Z',
              spots: 15,
              trainer_name: 'Rubén Castro',
            },
          ],
        }); // INSERT ... RETURNING

      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', 'Bearer cualquier-token')
        .send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 8,
        activity: 'Fuerza',
        room: 'Sala 3',
        startsAt: '2026-11-10T18:00:00.000Z',
        spots: 15,
        trainerName: 'Rubén Castro',
      });
    });

    it('devuelve 400 si el monitor no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // trainers vacía

      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', 'Bearer cualquier-token')
        .send({ ...dto, trainerId: 99 });

      expect(response.status).toBe(400);
    });

    it('devuelve 400 si el body es inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/classes')
        .set('Authorization', 'Bearer cualquier-token')
        .send({ activity: '', room: '', spots: 0, trainerId: 0 });

      expect(response.status).toBe(400);
    });
  });
});
