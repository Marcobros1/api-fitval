## Pregunta 0

error: GH013: Repository rule violations found for refs/heads/main.

## Pregunta 1: ¿qué código recibe el cliente con PostgreSQL parado? ¿Qué ves en la terminal que el cliente no ve? ¿Por qué es mejor así?

Con PostgreSQL parado, el cliente recibe HTTP 500 con {"statusCode":500,"message":"Internal server error"}. En la terminal de NestJS aparece el error completo: ECONNREFUSED en ::1:5433 y 127.0.0.1:5433, con la traza de la conexión. Es mejor así porque el cliente no ve detalles internos (puerto, dirección ni traza) y el log del servidor conserva lo necesario para diagnosticar.

## Pregunta 2: ¿cuántas clases salen con cada versión? Explica qué ha pasado con la consulta en la versión mala.

Con la versión que pega el texto en el SQL salen las 7 clases y con $1 salen 0. En la mala, a PostgreSQL le llega `WHERE c.activity ILIKE '%zzz' OR 1=1 --%' ORDER BY c.starts_at`: la comilla cierra el texto, OR 1=1 siempre es verdadero y -- comenta el resto, mientras que con $1 el valor viaja aparte y se trata solo como texto.