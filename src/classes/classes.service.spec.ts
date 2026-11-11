import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';

describe('ClassesService', () => {
  let service: ClassesService;
  let pool: { query: jest.Mock };

  beforeEach(async () => {
    pool = { query: jest.fn() };
    pool.query.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: Pool, useValue: pool },
      ],
    }).compile();
    service = module.get(ClassesService);
  });

  describe('findAll', () => {
    it('devuelve clases ordenadas por fecha de inicio', async () => {
      pool.query.mockResolvedValue({ rows: [
        {
          id: 1,
          activity: 'Spinning',
          room: 'Sala 1',
          starts_at: '2026-11-02T09:00:00.000Z',
          spots: 12,
          trainer_name: 'Carla Navarro',
        },
      ] });

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        activity: 'Spinning',
        room: 'Sala 1',
        startsAt: '2026-11-02T09:00:00.000Z',
        spots: 12,
        trainerName: 'Carla Navarro',
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY c.starts_at'),
      );
    });

    it('filtra por actividad con ILIKE y parámetro', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await service.findAll('yoga');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE $1'),
        ['%yoga%'],
      );
    });
  });

  describe('findOne', () => {
    it('devuelve una clase por su id', async () => {
      pool.query.mockResolvedValue({ rows: [
        {
          id: 7,
          activity: 'Crossfit',
          room: 'Sala 3',
          starts_at: '2026-11-05T20:00:00.000Z',
          spots: 3,
          trainer_name: 'Carla Navarro',
        },
      ] });

      const result = await service.findOne(7);

      expect(result).toEqual({
        id: 7,
        activity: 'Crossfit',
        room: 'Sala 3',
        startsAt: '2026-11-05T20:00:00.000Z',
        spots: 3,
        trainerName: 'Carla Navarro',
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1'),
        [7],
      );
    });

    it('lanza NotFoundException si la clase no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto: CreateClassDto = {
      activity: 'Fuerza',
      room: 'Sala 3',
      startsAt: '2026-11-10T18:00:00Z',
      spots: 15,
      trainerId: 4,
    };

    it('verifica que el monitor exista antes de insertar', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 4 }] }) // trainers
        .mockResolvedValueOnce({ rows: [
          {
            id: 8,
            activity: 'Fuerza',
            room: 'Sala 3',
            starts_at: '2026-11-10T18:00:00.000Z',
            spots: 15,
            trainer_name: 'Rubén Castro',
          },
        ] }); // INSERT ... RETURNING

      const result = await service.create(dto);

      expect(result.id).toBe(8);
      expect(result.trainerName).toBe('Rubén Castro');
      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM trainers WHERE id = $1',
        [4],
      );
    });

    it('lanza BadRequestException si el monitor no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(pool.query).toHaveBeenCalledTimes(1); // no llega al INSERT
    });
  });

  describe('remove', () => {
    it('borra una clase sin reservas y la devuelve con el nombre del monitor', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // COUNT bookings
        .mockResolvedValueOnce({ rows: [
          {
            id: 8,
            activity: 'Fuerza',
            room: 'Sala 3',
            starts_at: '2026-11-10T18:00:00.000Z',
            spots: 15,
            trainer_name: 'Rubén Castro',
          },
        ] }); // DELETE ... RETURNING

      const result = await service.remove(8);

      expect(result).toEqual({
        id: 8,
        activity: 'Fuerza',
        room: 'Sala 3',
        startsAt: '2026-11-10T18:00:00.000Z',
        spots: 15,
        trainerName: 'Rubén Castro',
      });
      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*)::int AS total FROM bookings WHERE class_id = $1',
        [8],
      );
      expect(pool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('DELETE FROM classes WHERE id = $1'),
        [8],
      );
    });

    it('lanza ConflictException si la clase tiene reservas', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ total: '3' }] });

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });

    it('lanza NotFoundException si la clase no existe', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // COUNT bookings
        .mockResolvedValueOnce({ rows: [] }); // DELETE devuelve 0 filas

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
