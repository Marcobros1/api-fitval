import { TrainerRow, toTrainer } from './trainer';

describe('toTrainer', () => {
  it('junta dos filas de la misma monitora en un monitor con sus especialidades', () => {
    // Preparar: Carla tiene dos especialidades, así que el JOIN da dos filas
    const rows: TrainerRow[] = [
      {
        id: 1,
        name: 'Carla Navarro',
        email: 'carla@gym.com',
        specialty: 'Ciclo indoor',
      },
      {
        id: 1,
        name: 'Carla Navarro',
        email: 'carla@gym.com',
        specialty: 'Fuerza',
      },
    ];

    // Ejecutar
    const trainer = toTrainer(rows);

    // Comprobar
    expect(trainer).toEqual({
      id: 1,
      name: 'Carla Navarro',
      email: 'carla@gym.com',
      specialties: ['Ciclo indoor', 'Fuerza'],
    });
  });

  it('no devuelve el DNI', () => {
    const rows = [
      {
        id: 1,
        name: 'Carla Navarro',
        email: 'carla@gym.com',
        specialty: 'Fuerza',
      },
    ] as TrainerRow[];

    const trainer = toTrainer(rows) as unknown as Record<string, unknown>;

    expect(trainer).not.toHaveProperty('dni');
  });

  it('devuelve null si no hay filas', () => {
    expect(toTrainer([])).toBeNull();
  });
});
