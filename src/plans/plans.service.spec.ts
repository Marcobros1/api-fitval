import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  let service: PlansService;
  let pool: { query: jest.Mock };

  beforeEach(async () => {
    pool = { query: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansService, { provide: Pool, useValue: pool }],
    }).compile();
    service = module.get(PlansService);
  });

  it('devuelve los planes ordenados por precio con el precio como número', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: 1, name: 'Básico', monthly_price: '29.90' },
        { id: 2, name: 'Premium', monthly_price: '49.00' },
      ],
    });

    const result = await service.findAll();

    expect(result).toEqual([
      { id: 1, name: 'Básico', monthlyPrice: 29.9 },
      { id: 2, name: 'Premium', monthlyPrice: 49 },
    ]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY monthly_price'),
    );
  });

  it('devuelve una lista vacía si no hay planes', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(service.findAll()).resolves.toEqual([]);
  });
});
