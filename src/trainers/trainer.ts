// Así llega un monitor desde PostgreSQL (con especialidades, del JOIN)
export interface TrainerRow {
  id: number;
  dni: string;
  name: string;
  email: string;
  specialty: string | null;
}

// Así la devuelve nuestra API
export interface Trainer {
  id: number;
  dni: string;
  name: string;
  email: string;
  specialties: string[];
}

// Convierte filas del JOIN en un monitor de la API
export function toTrainer(rows: TrainerRow[]): Trainer | null {
  if (rows.length === 0) return null;

  const first = rows[0];
  return {
    id: first.id,
    dni: first.dni,
    name: first.name,
    email: first.email,
    specialties: rows
      .map((r) => r.specialty)
      .filter((s): s is string => s !== null)
      .sort(),
  };
}
