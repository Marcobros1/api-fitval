import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppController } from './app.controller';
import { AppModule } from './app.module';
import { DatabaseModule } from './database/database.module';

describe('AppController', () => {
  let controller: AppController;
  let pool: { query: jest.Mock };

  beforeEach(async () => {
    pool = { query: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: Pool, useValue: pool }],
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('health devuelve ok y el nombre de la base de datos', async () => {
    pool.query.mockResolvedValue({ rows: [{ database: 'fitval' }] });

    await expect(controller.health()).resolves.toEqual({
      status: 'ok',
      database: 'fitval',
    });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT current_database() AS database',
    );
  });

  it('health propaga el error si PostgreSQL no responde', async () => {
    pool.query.mockRejectedValue(
      new Error('connect ECONNREFUSED 127.0.0.1:5433'),
    );

    await expect(controller.health()).rejects.toThrow('ECONNREFUSED');
  });
});

describe('DatabaseModule', () => {
  it('registra un Pool de pg que se puede pedir por inyección', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    const pool = moduleRef.get(Pool);
    expect(pool).toBeInstanceOf(Pool);

    await pool.end(); // no llegó a conectar, pero cierra el pool igualmente
  });
});

describe('GET /api/health (HTTP)', () => {
  let app: INestApplication;
  let pool: { query: jest.Mock };

  beforeAll(async () => {
    pool = { query: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Pool)
      .useValue(pool)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('200 con status ok cuando la base de datos responde', async () => {
    pool.query.mockResolvedValue({ rows: [{ database: 'fitval' }] });

    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'fitval' });
  });

  it('500 genérico sin detalles internos cuando PostgreSQL no responde', async () => {
    pool.query.mockRejectedValue(
      new Error('connect ECONNREFUSED 127.0.0.1:5433'),
    );

    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(JSON.stringify(response.body)).not.toContain('5433');
  });
});
