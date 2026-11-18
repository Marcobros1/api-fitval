import { TrainerRow, toTrainer } from './trainer';

describe('toTrainer', () => {
  it('junta dos filas de la misma monitora en un monitor con sus especialidades', () => {
    // Preparar: Carla tiene dos especialidades, así que el JOIN da dos filas
    const rows: TrainerRow[] = [
      {
        id: 1,
        name: 'Carla Navarro',
        email: 'carla@gym.com',
        photo_url: null,
        specialty: 'Ciclo indoor',
      },
      {
        id: 1,
        name: 'Carla Navarro',
        email: 'carla@gym.com',
        photo_url: null,
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
      photoUrl: null,
      specialties: ['Ciclo indoor', 'Fuerza'],
    });
  });

  it('devuelve la dirección de la foto cuando el monitor tiene una', () => {
    const rows: TrainerRow[] = [
      {
        id: 2,
        name: 'Javier Ortega',
        email: 'javier@gym.com',
        photo_url: '/uploads/3f2a-c1.png',
        specialty: 'Yoga',
      },
    ];

    expect(toTrainer(rows)).toMatchObject({
      photoUrl: '/uploads/3f2a-c1.png',
    });
  });

  it('no devuelve el DNI ni el nombre de columna photo_url', () => {
    const rows: TrainerRow[] = [
      {
        id: 1,
        name: 'Carla Navarro',
        email: 'carla@gym.com',
        photo_url: null,
        specialty: 'Fuerza',
      },
    ];

    const trainer = toTrainer(rows) as unknown as Record<string, unknown>;

    expect(trainer).not.toHaveProperty('dni');
    expect(trainer).not.toHaveProperty('photo_url');
  });

  it('devuelve null si no hay filas', () => {
    expect(toTrainer([])).toBeNull();
  });
});
