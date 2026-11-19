## Pregunta 0

error: GH013: Repository rule violations found for refs/heads/main.

## Pregunta 1

El cliente recibe HTTP 500 con mensaje genérico. En la terminal aparece el error completo de conexión (ECONNREFUSED). Es mejor así porque el cliente no ve detalles internos y el servidor conserva el log para diagnosticar.

## Pregunta 2

Con el texto pegado en el SQL salen las 7 clases (inyección); con `$1` salen 0. En la versión mala, PostgreSQL recibe `ILIKE '%zzz' OR 1=1 --%'`, donde `OR 1=1` es siempre verdadero y `--` comenta el resto.

## Pregunta 3

Para devolver un 400 claro y controlado en lugar de un 500 con el error crudo de la clave ajena (código 23503). Sin la comprobación, el cliente vería información interna de la base de datos.

## Pregunta 4

Porque el cuerpo de la petición es correcto; el problema es un conflicto de negocio: la clase tiene reservas activas y borrarla rompería la integridad de quienes se habían apuntado.

## Pregunta 5

Lleva `{"sub":1,"iat":...,"exp":...}`: su id y las fechas de creación y caducidad. No metemos el rol porque el token dura una hora; si cambia el rol, el token seguiría diciendo lo de antes, así que el rol se lee de la BD en cada petición.

## Pregunta 6

Funciona porque el token solo lleva `{"sub":2}`, no el rol. El `StaffGuard` lee el rol de la BD en cada petición, así que al cambiarlo a `staff` en psql, el mismo token ya pasa. Si el rol estuviera en el token, seguiría diciendo `member` hasta que hiciera login de nuevo.

## Pregunta 7

No necesita PostgreSQL porque usa un `Pool` falso (`jest.fn()`) que simula las respuestas en memoria.

No puede comprobar que las consultas SQL sean correctas, que las tablas existan, ni que las claves foráneas funcionen. Solo comprueba que el servicio reaccione a lo que el `Pool` falso devuelve.

## Pregunta 8

`Date.now()` genera un correo único por ejecución para evitar colisiones. Si usara un correo fijo, la segunda ejecución fallaría con 409 (conflicto: el usuario ya existe).

## Pregunta 9

El `ORDER BY` interpola `${sortColumn}`, pero ese valor sale de `SORT_COLUMNS`, un mapa fijo que solo tiene las claves `startsAt`, `activity` y `spots`. Antes, `ListClassesQueryDto` valida `sort` con `@IsEnum(ClassSortField)`: `sort=id;DROP TABLE classes` no es un valor del enum y la API responde 400 sin llegar al servicio. Y aunque llegara, `SORT_COLUMNS[sort]` sería `undefined`, nunca texto del usuario. El texto de la petición nunca se pega en el SQL.

## Pregunta 10

El login tiene límite más duro (5/min vs 20/min) para frenar **fuerza bruta / credential stuffing**: evita que un atacante pruebe miles de contraseñas rápidamente. Sin `app.set('trust proxy', 1)` en Render, el rate limiter vería la IP del proxy (balancer de Render) y bloquearía a todos los usuarios tras 5 peticiones, no al atacante real.

## Pregunta 11

Sin la transacción, el monitor se guardaría en `trainers` antes de comprobar las especialidades: al fallar la 99, el `INSERT` del monitor ya estaría hecho y quedaría a medias. Con `BEGIN`/`ROLLBACK`, al lanzar el 400 se deshace todo y no queda nada. Lo he comprobado: tras el 400 de `[2, 99]`, `SELECT` no encuentra ningún monitor con ese DNI.

Nuria no tiene el id 5 porque la secuencia `GENERATED ALWAYS AS IDENTITY` ya ha asignado ids a los monitores 1 a 4 y a los que se han insertado en pruebas anteriores. Los ids no se reutilizan: un intento fallido o un `ROLLBACK` también consume un id de la secuencia, así que el siguiente monitor tiene el id siguiente aunque el anterior no quedara guardado.

## Pregunta 12

El navegador, no la API. La API responde 200 a cualquiera; el navegador compara la cabecera `Access-Control-Allow-Origin` con el origen de la página y, si no coinciden, bloquea la lectura en el JavaScript de esa web. Postman no es un navegador, así que no aplica CORS y lee la respuesta sin más.

## Pregunta 13

En Supabase, `/api/v1/health` responde `"database":"postgres"`, no `"fitval"`. El código no ha cambiado: `health` pregunta a PostgreSQL con `current_database()`, y ahora ese nombre es el de la base de datos del proyecto de Supabase. Lo único que he cambiado es la `DATABASE_URL` del `.env`.
