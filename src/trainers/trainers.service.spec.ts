import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('TrainersService', () => {
  let service: TrainersService;
  let pool: { query: jest.Mock; connect: jest.Mock };

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    pool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };
    mockClient.query.mockReset();
    mockClient.release.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [TrainersService, { provide: Pool, useValue: pool }],
    }).compile();

    service = moduleRef.get(TrainersService);
  });

  describe('findOne', () => {
    it('devuelve el monitor con sus especialidades ordenadas', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            dni: '90000001J',
            name: 'Carla Navarro',
            email: 'carla@gym.com',
            specialty: 'Ciclo indoor',
          },
          {
            id: 1,
            dni: '90000001J',
            name: 'Carla Navarro',
            email: 'carla@gym.com',
            specialty: 'Fuerza',
          },
        ],
      } as any);

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Carla Navarro');
      expect(result.dni).toBe('90000001J');
      expect(result.email).toBe('carla@gym.com');
      expect(result.specialties).toEqual(['Ciclo indoor', 'Fuerza']);
    });

    it('lanza NotFoundException si el monitor no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateTrainerDto = {
      dni: '90000002K',
      name: 'Javier Ortega',
      email: 'javier@gym.com',
      specialtyIds: [{ id: 2 }, { id: 3 }],
    };

    it('crea monitor con especialidades en transacción y lo devuelve', async () => {
      // Transacción BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN

      // Insert trainer
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5 }],
      }); // INSERT trainer RETURNING id

      // Promise.all: check all specialties (2 calls)
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 3 }] });

      // Promise.all: insert all specialties (2 calls)
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // findOne call to return the created trainer
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            dni: '90000002K',
            name: 'Javier Ortega',
            email: 'javier@gym.com',
            specialty: 'Yoga',
          },
          {
            id: 5,
            dni: '90000002K',
            name: 'Javier Ortega',
            email: 'javier@gym.com',
            specialty: 'Pilates',
          },
        ],
      } as any);

      const result = await service.create(createDto);

      expect(result.id).toBe(5);
      expect(result.name).toBe('Javier Ortega');
      expect(result.dni).toBe('90000002K');
      expect(result.email).toBe('javier@gym.com');
      expect(result.specialties).toEqual(['Pilates', 'Yoga']); // sorted

      // Verify transaction calls
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('hace ROLLBACK y lanza BadRequestException si la especialidad no existe', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 5 }] }); // INSERT trainer

      // Promise.all: check specialties (1 call for the single specialty)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // NOT FOUND

      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.create({ ...createDto, specialtyIds: [{ id: 99 }] }),
      ).rejects.toThrow(BadRequestException);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('hace ROLLBACK y lanza ConflictException si DNI o email duplicado', async () => {
      const pgError = new Error('duplicate') as Error & { code: string };
      pgError.code = '23505';

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(pgError); // INSERT trainer throws
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
