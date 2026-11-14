import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { GymClass, GymClassRow, toGymClass } from './gym-class';
import { CreateClassDto } from './dto/create-class.dto';

// Las columnas de una clase, con el nombre del monitor (JOIN con trainers)
const SELECT_CLASSES = `
  SELECT c.id, c.activity, c.room, c.starts_at, c.spots, t.name AS trainer_name
  FROM classes c
  JOIN trainers t ON t.id = c.trainer_id`;

@Injectable()
export class ClassesService {
  constructor(private readonly pool: Pool) {}

  // GET /api/classes: ordenadas por fecha de inicio.
  // Con ?activity=yoga solo las que contienen ese texto (sin distinguir mayúsculas).
  async findAll(activity?: string): Promise<GymClass[]> {
    const result = activity
      ? await this.pool.query<GymClassRow>(
          `${SELECT_CLASSES} WHERE c.activity ILIKE $1 ORDER BY c.starts_at`,
          [`%${activity}%`], // el valor viaja como parámetro, nunca dentro del SQL
        )
      : await this.pool.query<GymClassRow>(
          `${SELECT_CLASSES} ORDER BY c.starts_at`,
        );

    return result.rows.map(toGymClass); // cada fila → una clase de la API
  }

  // GET /api/classes/:id: una clase, o 404 si no existe
  async findOne(id: number): Promise<GymClass> {
    const result = await this.pool.query<GymClassRow>(
      `${SELECT_CLASSES} WHERE c.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`No existe la clase con id ${id}`);
    }
    return toGymClass(result.rows[0]);
  }

  // POST /api/classes: crea una clase y la devuelve con el nombre del monitor
  async create(dto: CreateClassDto): Promise<GymClass> {
    const trainerExists = await this.pool.query<{ id: number }>(
      'SELECT id FROM trainers WHERE id = $1',
      [dto.trainerId],
    );
    if (trainerExists.rows.length === 0) {
      throw new BadRequestException(
        `No existe el monitor con id ${dto.trainerId}`,
      );
    }

    const result = await this.pool.query<GymClassRow>(
      `WITH new_class AS(
        INSERT INTO classes (activity, room, starts_at, spots, trainer_id)
        VALUES ($1, $2, $3, $4, $5)
          RETURNING id, activity, room, starts_at,spots, trainer_id
        )
      SELECT c.id, c.activity, c.room, c.starts_at, c.spots, t.name AS trainer_name
      FROM new_class c
      JOIN trainers t ON t.id = c.trainer_id`,
      [dto.activity, dto.room, dto.startsAt, dto.spots, dto.trainerId],
    );
    return toGymClass(result.rows[0]);
  }

  // DELETE /api/classes/:id: borra una clase y la devuelve.
  // 404 si no existe. 409 si tiene reservas.
  async remove(id: number): Promise<GymClass> {
    const bookings = await this.pool.query<{ total: string }>(
      'SELECT COUNT(*)::int AS total FROM bookings WHERE class_id = $1',
      [id],
    );
    if (Number(bookings.rows[0].total) > 0) {
      throw new ConflictException(
        `No se puede borrar la clase ${id}: tiene reservas activas`,
      );
    }

    const result = await this.pool.query<GymClassRow>(
      `WITH deleted AS (
         DELETE FROM classes WHERE id = $1
         RETURNING id, activity, room, starts_at, spots, trainer_id
       )
       SELECT d.id, d.activity, d.room, d.starts_at, d.spots, t.name AS trainer_name
       FROM deleted d
       JOIN trainers t ON t.id = d.trainer_id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`No existe la clase con id ${id}`);
    }

    return toGymClass(result.rows[0]);
  }
}
