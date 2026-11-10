import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { GymClass, GymClassRow, toGymClass } from './gymclass';

@Injectable()
export class ClassesService {
  constructor(private readonly pool: Pool) {}

  // GET /api/classes: del más barato al más caro
  async findAll(): Promise<GymClass[]> {
    const result = await this.pool.query<GymClassRow>(
      'SELECT c.id, c.activity, c.room, c.starts_at, c.spots, t.name AS trainer_name FROM classes c JOIN trainers t ON t.id = c.trainer_id ORDER BY c.starts_at',
    );
    return result.rows.map(toGymClass); // cada fila → un plan de la API
  }
}
