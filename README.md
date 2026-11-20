# API de FitVal

API del gimnasio FitVal, hecha con NestJS y PostgreSQL. Permite consultar planes y clases, gestionar monitores y sus especialidades, subir la foto de un monitor, y registrarse e iniciar sesión con JWT. Los endpoints de escritura están reservados al personal (`staff`).

## Despliegue

- **API:** https://api-fitval-marcodemiguel.onrender.com
- **Documentación interactiva (Swagger):** https://api-fitval-marcodemiguel.onrender.com/docs

El plan gratuito de Render se duerme tras 15 minutos sin uso. La primera petición tras una pausa puede tardar alrededor de un minuto.

La base de datos es un proyecto de Supabase (PostgreSQL). Render usa la dirección del *Session pooler*.

## Requisitos

- Node.js 24 o superior
- Docker, para PostgreSQL en local

## Puesta en marcha en local

```bash
npm install
docker compose up -d          # PostgreSQL 17 en el puerto 5433
```

Carga la base de datos (tablas y datos de prueba) con el fichero `database/schema.sql`:

```bash
# Git Bash, macOS o Linux
docker exec -i postgres-fitval psql -U alumno -d fitval < database/schema.sql

# PowerShell
Get-Content database/schema.sql | docker exec -i postgres-fitval psql -U alumno -d fitval
```

Crea un `.env` en la raíz a partir de `.env.example`:

```env
DATABASE_URL=postgres://alumno:CAMBIAME@localhost:5433/fitval
JWT_SECRET=un-texto-largo-y-aleatorio
CORS_ORIGIN=http://localhost:5173
```

Arranca la API:

```bash
npm run start:dev             # http://localhost:3000
```

El `.env` no se sube a GitHub. En Render las mismas variables se escriben en la pestaña **Environment**.

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_SECRET` | Clave con la que se firman los tokens. Debe ser distinta en cada entorno |
| `CORS_ORIGIN` | Dirección de la web que puede usar la API desde el navegador. Por defecto, `http://localhost:5173` |
| `PORT` | Puerto de la API. Por defecto, 3000. Render lo asigna solo |

## Rutas principales

Todas las rutas empiezan por `/api`. Las versiones se indican en la ruta (`/api/v1`, `/api/v2`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/v1/health` | Público | Estado de la API y de la base de datos |
| GET | `/api/v1/plans` | Público | Planes y precios |
| GET | `/api/v1/classes` | Público | Clases. Filtro opcional `?activity=yoga` |
| GET | `/api/v1/classes/:id` | Público | Una clase |
| POST | `/api/v1/classes` | Staff | Crear una clase |
| DELETE | `/api/v1/classes/:id` | Staff | Borrar una clase sin reservas |
| GET | `/api/v2/classes` | Público | Clases paginadas. Parámetros `page`, `limit` (1 a 50), `sort`, `order` |
| GET | `/api/v1/trainers/:id` | Público | Monitor con sus especialidades (sin DNI) |
| POST | `/api/v1/trainers` | Staff | Crear monitor y especialidades, todo o nada |
| POST | `/api/v1/trainers/:id/photo` | Staff | Subir la foto del monitor (PNG, JPG o WEBP, máximo 2 MB) |
| POST | `/api/v1/auth/register` | Público | Registro. Devuelve el usuario con rol `member` |
| POST | `/api/v1/auth/login` | Público | Login. Devuelve un `accessToken` |
| GET | `/api/v1/auth/me` | Con token | Datos del usuario del token |

Los códigos de respuesta siguen la convención habitual: `200` y `201` para éxito, `400` para datos mal formados, `401` sin token válido, `403` sin permiso, `404` si no existe, `409` si choca con un dato existente, y `429` si se supera el límite de peticiones.

## Tests

```bash
npm test                 # unitarios (src/**/*.spec.ts)
npm run test:e2e         # integración (test/*.e2e-spec.ts), necesita PostgreSQL
```

Los tests de integración usan la base de datos del `.env`. Por eso, para ejecutarlos, el `.env` debe apuntar a Docker y no a Supabase.

En cada PR, GitHub Actions ejecuta el lint y los tests unitarios (`.github/workflows/ci.yml`).

## Estructura

```text
src/
  auth/        registro, login, JWT y guards (AuthGuard, StaffGuard)
  classes/     clases: lectura, alta, borrado y paginación
  plans/       planes
  trainers/    monitores, especialidades y fotos
  users/       usuarios
  database/    conexión a PostgreSQL
  common/      filtro global de errores
test/          tests de integración
database/      schema.sql: tablas y datos de prueba
```

## Notas de seguridad

- Las contraseñas se guardan como hash con argon2, nunca en texto plano.
- Las cabeceras de seguridad las añade `helmet`.
- El login y el resto de rutas tienen límite de peticiones por IP.
- Las fotos se guardan en el disco del servidor. En Render ese disco se borra en cada despliegue, así que las fotos no son permanentes; ver las notas de la Parte 13 de la entrega.

