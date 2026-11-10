import { Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { GymClass, GymClassRow, toGymClass } from './gymclass';

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
}
