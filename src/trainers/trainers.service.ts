import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { Trainer, TrainerRow, toTrainer } from './trainer';
import { CreateTrainerDto } from './dto/create-trainer.dto';

@Injectable()
export class TrainersService {
  constructor(private readonly pool: Pool) {}

  // GET /api/v1/trainers/:id - monitor con sus especialidades
  async findOne(id: number): Promise<Trainer> {
    const result = await this.pool.query<TrainerRow>(
      `
      SELECT t.id, t.dni, t.name, t.email, s.name AS specialty
      FROM trainers t
      LEFT JOIN trainer_specialties ts ON ts.trainer_id = t.id
      LEFT JOIN specialties s ON s.id = ts.specialty_id
      WHERE t.id = $1
      ORDER BY s.name
    `,
      [id],
    );

    const trainer = toTrainer(result.rows);
    if (!trainer) {
      throw new NotFoundException(`No existe el monitor con id ${id}`);
    }
    return trainer;
  }

  // POST /api/v1/trainers - alta de monitor con especialidades (transacción)
  async create(dto: CreateTrainerDto): Promise<Trainer> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Insertar monitor
      const trainerResult = await client.query<{ id: number }>(
        `
        INSERT INTO trainers (dni, name, email)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
        [dto.dni, dto.name, dto.email],
      );

      const trainerId = trainerResult.rows[0].id;

      // 2. Verificar todas las especialidades (Promise.all evita await en loop)
      const specialtyChecks = await Promise.all(
        dto.specialtyIds.map((sp) =>
          client.query('SELECT id FROM specialties WHERE id = $1', [sp.id]),
        ),
      );
      for (let i = 0; i < specialtyChecks.length; i++) {
        if (specialtyChecks[i].rows.length === 0) {
          throw new BadRequestException(
            `No existe la especialidad ${dto.specialtyIds[i].id}`,
          );
        }
      }

      // 3. Insertar todas las especialidades (Promise.all evita await en loop)
      await Promise.all(
        dto.specialtyIds.map((sp) =>
          client.query(
            'INSERT INTO trainer_specialties (trainer_id, specialty_id) VALUES ($1, $2)',
            [trainerId, sp.id],
          ),
        ),
      );

      await client.query('COMMIT');

      // Devolver monitor completo
      return this.findOne(trainerId);
    } catch (error) {
      await client.query('ROLLBACK');
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        // unique violation (dni o email duplicado)
        throw new ConflictException('DNI o correo ya registrado');
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
