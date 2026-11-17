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

El `ORDER BY` usa interpolación pero el valor viene de un objeto `SORT_COLUMNS` que mapea claves permitidas a columnas reales. El input del usuario nunca toca el SQL directamente: `sort=id;DROP TABLE` no existe en el mapa, así que `SORT_COLUMNS[sort]` es `undefined` y la validación del DTO (`IsEnum`) lo rechaza con 400 antes de llegar al servicio.