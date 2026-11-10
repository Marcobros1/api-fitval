import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Plan, PlanRow, toPlan } from './plan';

@Injectable()
export class PlansService {
  constructor(private readonly pool: Pool) {}

  // GET /api/plans: del más barato al más caro
  async findAll(): Promise<Plan[]> {
    const result = await this.pool.query<PlanRow>(
      'SELECT id, name, monthly_price FROM plans ORDER BY monthly_price',
    );
    return result.rows.map(toPlan); // cada fila → un plan de la API
  }
}
