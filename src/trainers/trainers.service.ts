import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { Trainer, TrainerRow, toTrainer } from './trainer';
import { CreateTrainerDto } from './dto/create-trainer.dto';

@Injectable()
export class TrainersService {
  constructor(private readonly pool: Pool) {}

  // GET /api/v1/trainers/:id: el monitor con sus especialidades, o 404
  async findOne(id: number): Promise<Trainer> {
    const result = await this.pool.query<TrainerRow>(
      `SELECT t.id, t.name, t.email, t.photo_url, s.name AS specialty
       FROM trainers t
       LEFT JOIN trainer_specialties ts ON ts.trainer_id = t.id
       LEFT JOIN specialties s ON s.id = ts.specialty_id
       WHERE t.id = $1
       ORDER BY s.id`,
      [id],
    );

    const trainer = toTrainer(result.rows);
    if (!trainer) {
      throw new NotFoundException(`No existe el monitor con id ${id}`);
    }
    return trainer;
  }

  // POST /api/v1/trainers/:id/photo: guarda la dirección de la foto y devuelve el monitor
  async setPhoto(id: number, photoUrl: string): Promise<Trainer> {
    await this.pool.query('UPDATE trainers SET photo_url = $1 WHERE id = $2', [
      photoUrl,
      id,
    ]);
    return this.findOne(id); // 404 si el monitor no existe
  }

  // POST /api/v1/trainers: monitor y especialidades, todo o nada
  async create(dto: CreateTrainerDto): Promise<Trainer> {
    const trainerId = await this.insertWithSpecialties(dto);
    return this.findOne(trainerId);
  }

  // La transacción: si una especialidad no existe, no se guarda nada
  private async insertWithSpecialties(dto: CreateTrainerDto): Promise<number> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const inserted = await client.query<{ id: number }>(
        'INSERT INTO trainers (dni, name, email) VALUES ($1, $2, $3) RETURNING id',
        [dto.dni, dto.name, dto.email],
      );
      const trainerId = inserted.rows[0].id;

      // Una sola consulta: ¿qué especialidades de la lista existen?
      const found = await client.query<{ id: number }>(
        'SELECT id FROM specialties WHERE id = ANY($1::int[])',
        [dto.specialtyIds],
      );
      const foundIds = new Set(found.rows.map((row) => row.id));
      const missing = dto.specialtyIds.find((id) => !foundIds.has(id));
      if (missing !== undefined) {
        throw new BadRequestException(`No existe la especialidad ${missing}`);
      }

      // Una sola consulta para guardar todas las especialidades
      await client.query(
        `INSERT INTO trainer_specialties (trainer_id, specialty_id)
         SELECT $1, unnest($2::int[])`,
        [trainerId, dto.specialtyIds],
      );

      await client.query('COMMIT');
      return trainerId;
    } catch (error) {
      await client.query('ROLLBACK');
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        // DNI o correo ya existentes
        throw new ConflictException('DNI o correo ya registrado');
      }
      throw error;
    } finally {
      client.release(); // devuelve la conexión al pool, pase lo que pase
    }
  }
}
