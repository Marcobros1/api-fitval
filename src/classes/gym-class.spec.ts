import { GymClassRow, toGymClass } from './gym-class';

describe('toGymClass', () => {
  it('convierte una fila de la base de datos en una clase de la API', () => {
    // 1. Preparar: una fila como las que devuelve PostgreSQL
    const row: GymClassRow = {
      id: 1,
      activity: 'Spinning',
      room: 'Sala 1',
      starts_at: new Date('2026-11-02T09:00:00Z'),
      spots: 12,
      trainer_name: 'Carla Navarro',
    };

    // 2. Ejecutar
    const gymClass = toGymClass(row);

    // 3. Comprobar
    expect(gymClass).toEqual({
      id: 1,
      activity: 'Spinning',
      room: 'Sala 1',
      startsAt: new Date('2026-11-02T09:00:00Z'),
      spots: 12,
      trainerName: 'Carla Navarro',
    });
  });

  it('no deja los nombres de columna de la base de datos', () => {
    const row: GymClassRow = {
      id: 1,
      activity: 'Spinning',
      room: 'Sala 1',
      starts_at: new Date('2026-11-02T09:00:00Z'),
      spots: 12,
      trainer_name: 'Carla Navarro',
    };

    const gymClass = toGymClass(row);

    expect(gymClass).not.toHaveProperty('starts_at');
    expect(gymClass).not.toHaveProperty('trainer_name');
  });
});
