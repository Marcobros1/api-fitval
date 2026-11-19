// Así llega un monitor desde PostgreSQL: una fila por especialidad (del JOIN)
export interface TrainerRow {
  id: number;
  name: string;
  email: string;
  photo_url: string | null;
  specialty: string | null;
}

// Así lo devuelve nuestra API. Sin el DNI: es un dato personal
export interface Trainer {
  id: number;
  name: string;
  email: string;
  photoUrl: string | null;
  specialties: string[];
}

// Junta las filas del JOIN en un monitor. Las filas ya llegan ordenadas por s.id
export function toTrainer(rows: TrainerRow[]): Trainer | null {
  if (rows.length === 0) return null;

  const first = rows[0];
  return {
    id: first.id,
    name: first.name,
    email: first.email,
    photoUrl: first.photo_url,
    specialties: rows
      .map((row) => row.specialty)
      .filter((specialty): specialty is string => specialty !== null),
  };
}
