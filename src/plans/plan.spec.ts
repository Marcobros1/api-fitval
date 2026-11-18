import { PlanRow, toPlan } from './plan';

describe('toPlan', () => {
  it('convierte el precio de texto en un número', () => {
    // NUMERIC llega de PostgreSQL como texto: "29.90"
    const row: PlanRow = { id: 1, name: 'Básico', monthly_price: '29.90' };

    const plan = toPlan(row);

    expect(plan.monthlyPrice).toBe(29.9);
    expect(plan).toEqual({ id: 1, name: 'Básico', monthlyPrice: 29.9 });
  });
});
