## Pregunta 0

error: GH013: Repository rule violations found for refs/heads/main.

## Pregunta 1: ¿qué código recibe el cliente con PostgreSQL parado? ¿Qué ves en la terminal que el cliente no ve? ¿Por qué es mejor así?

Con PostgreSQL parado, el cliente recibe HTTP 500 con {"statusCode":500,"message":"Internal server error"}. En la terminal de NestJS aparece el error completo: ECONNREFUSED en ::1:5433 y 127.0.0.1:5433, con la traza de la conexión. Es mejor así porque el cliente no ve detalles internos (puerto, dirección ni traza) y el log del servidor conserva lo necesario para diagnosticar.

## Pregunta 2: ¿cuántas clases salen con cada versión? Explica qué ha pasado con la consulta en la versión mala.

Con la versión que pega el texto en el SQL salen las 7 clases y con $1 salen 0. En la mala, a PostgreSQL le llega `WHERE c.activity ILIKE '%zzz' OR 1=1 --%' ORDER BY c.starts_at`: la comilla cierra el texto, OR 1=1 siempre es verdadero y -- comenta el resto, mientras que con $1 el valor viaja aparte y se trata solo como texto.

## Pregunta 3: PostgreSQL ya tiene una clave ajena en trainer_id. ¿Para qué comprobamos en la API que el monitor existe? ¿Qué recibiría el cliente si no lo hiciéramos?

Para devolver un 400 claro y controlado ("No existe el monitor con id X") en lugar de que PostgreSQL lance un error 500 con el detalle crudo de la clave ajena (código 23503). Sin la comprobación, el cliente recibiría un error 500 con información interna de la base de datos.

## Pregunta 4: ¿por qué borrar una clase con reservas es 409 y no 400?

Porque el cuerpo de la petición es sintácticamente correcto; el problema es un conflicto de negocio: la clase tiene reservas activas y borrarla rompería la integridad de quienes se habían apuntado. Es un conflicto de estado del recurso, no un error del cliente.

## Pregunta 5: ¿qué datos lleva el token de Ana y por qué no metemos el rol?

Lleva `{"sub":1,"iat":1794495988,"exp":1794499588}`: su id y las fechas de creación y caducidad (3600 s, una hora). No metemos el rol porque el token se queda con lo que había al hacer login y dura una hora; si cambia el rol de Ana, el token seguiría diciendo lo de antes, así que el rol se lee de la base de datos en cada petición.