-- Base de datos del gimnasio FitVal (la de la entrega de SQL, en inglés)
-- Se puede ejecutar todas las veces que quieras: borra y vuelve a crear todo.

DROP TABLE IF EXISTS users, trainer_specialties, specialties, bookings, classes, trainers, cards, members, plans;

CREATE TABLE plans (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  monthly_price NUMERIC(6,2) NOT NULL CHECK (monthly_price >= 0)
);

CREATE TABLE members (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dni VARCHAR(9) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  joined_at DATE NOT NULL,
  plan_id INTEGER NOT NULL REFERENCES plans(id)
);

CREATE TABLE cards (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  active BOOLEAN NOT NULL,
  member_id INTEGER UNIQUE NOT NULL REFERENCES members(id)
);

CREATE TABLE trainers (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dni VARCHAR(9) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE classes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  activity VARCHAR(50) NOT NULL,
  room VARCHAR(30) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  spots INTEGER NOT NULL CHECK (spots > 0),
  trainer_id INTEGER NOT NULL REFERENCES trainers(id)
);

CREATE TABLE bookings (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  booked_at DATE NOT NULL,
  UNIQUE (member_id, class_id)
);

CREATE TABLE specialties (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE trainer_specialties (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trainer_id INTEGER NOT NULL REFERENCES trainers(id),
  specialty_id INTEGER NOT NULL REFERENCES specialties(id),
  UNIQUE (trainer_id, specialty_id)
);

-- Datos de prueba (los mismos de la entrega de SQL)

INSERT INTO plans (name, monthly_price) VALUES
  ('Básico', 29.90),
  ('Completo', 44.90),
  ('Estudiante', 24.90),
  ('Mañanas', 19.90);

INSERT INTO members (dni, name, email, joined_at, plan_id) VALUES
  ('11111111A', 'Ana Pérez', 'ana@gym.com', '2026-01-10', 2),
  ('22222222B', 'Luis García', 'luis@gym.com', '2026-02-03', 1),
  ('33333333C', 'Marta López', 'marta@gym.com', '2026-03-15', 3),
  ('44444444D', 'Hugo Sanz', 'hugo@gym.com', '2026-03-20', 2),
  ('55555555E', 'Lucía Ruiz', 'lucia@gym.com', '2026-05-02', 3),
  ('66666666F', 'Pablo Martín', 'pablo@gym.com', '2026-06-11', 1),
  ('77777777G', 'Sara Gil', 'sara@gym.com', '2026-09-01', 2),
  ('88888888H', 'Diego Vidal', 'diego@gym.com', '2026-10-01', 1);

INSERT INTO cards (code, active, member_id) VALUES
  ('TJ-0001', TRUE, 1),
  ('TJ-0002', TRUE, 2),
  ('TJ-0003', TRUE, 3),
  ('TJ-0004', FALSE, 4),
  ('TJ-0005', TRUE, 5),
  ('TJ-0006', TRUE, 6),
  ('TJ-0007', TRUE, 7);

INSERT INTO trainers (dni, name, email) VALUES
  ('90000001J', 'Carla Navarro', 'carla@gym.com'),
  ('90000002K', 'Javier Ortega', 'javier@gym.com'),
  ('90000003L', 'Elena Romero', 'elena@gym.com'),
  ('90000004M', 'Rubén Castro', 'ruben@gym.com');

INSERT INTO classes (activity, room, starts_at, spots, trainer_id) VALUES
  ('Spinning', 'Sala 1', '2026-11-02 09:00', 12, 1),
  ('Yoga', 'Sala 2', '2026-11-02 18:00', 10, 2),
  ('Pilates', 'Sala 2', '2026-11-03 10:00', 8, 3),
  ('Spinning', 'Sala 1', '2026-11-03 19:00', 12, 1),
  ('Zumba', 'Sala 3', '2026-11-04 18:30', 20, 3),
  ('Yoga', 'Sala 2', '2026-11-05 09:30', 10, 2),
  ('Crossfit', 'Sala 3', '2026-11-05 20:00', 3, 1);

INSERT INTO bookings (member_id, class_id, booked_at) VALUES
  (1, 1, '2026-10-28'),
  (1, 3, '2026-10-28'),
  (1, 7, '2026-10-29'),
  (2, 1, '2026-10-29'),
  (2, 2, '2026-10-29'),
  (3, 2, '2026-10-30'),
  (3, 5, '2026-10-30'),
  (4, 1, '2026-10-30'),
  (4, 7, '2026-10-31'),
  (5, 3, '2026-10-31'),
  (5, 5, '2026-10-31'),
  (6, 4, '2026-11-01'),
  (7, 5, '2026-11-01'),
  (7, 7, '2026-11-01');

INSERT INTO specialties (name) VALUES
  ('Ciclo indoor'), ('Yoga'), ('Pilates'), ('Baile'), ('Fuerza');

INSERT INTO trainer_specialties (trainer_id, specialty_id) VALUES
  (1, 1), (1, 5), (2, 2), (2, 3), (3, 3), (3, 4), (4, 5);

-- Tabla de usuarios para autenticación (apartado 4)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'staff'))
);