import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { UsersService } from './users.service';
import { User } from './user';

const ANA: User = {
  id: 1,
  email: 'ana@gym.com',
  password_hash: 'hash-de-ana',
  role: 'member',
};

describe('UsersService', () => {
  let service: UsersService;
  let pool: { query: jest.Mock };

  beforeEach(async () => {
    pool = { query: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: Pool, useValue: pool }],
    }).compile();
    service = module.get(UsersService);
  });

  describe('findByEmail', () => {
    it('busca por correo con un parámetro y devuelve el usuario', async () => {
      pool.query.mockResolvedValue({ rows: [ANA] });

      const result = await service.findByEmail('ana@gym.com');

      expect(result).toEqual(ANA);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['ana@gym.com'],
      );
    });

    it('devuelve undefined si no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(service.findByEmail('nadie@gym.com')).resolves.toBe(
        undefined,
      );
    });
  });

  describe('findById', () => {
    it('busca por id con un parámetro y devuelve el usuario', async () => {
      pool.query.mockResolvedValue({ rows: [ANA] });

      const result = await service.findById(1);

      expect(result).toEqual(ANA);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [1],
      );
    });

    it('devuelve undefined si no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(service.findById(99)).resolves.toBe(undefined);
    });
  });

  describe('create', () => {
    it('inserta el correo y el hash, nunca la contraseña', async () => {
      pool.query.mockResolvedValue({ rows: [ANA] });

      const result = await service.create('ana@gym.com', 'hash-de-ana');

      expect(result).toEqual(ANA);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users (email, password_hash)'),
        ['ana@gym.com', 'hash-de-ana'],
      );
    });
  });
});
