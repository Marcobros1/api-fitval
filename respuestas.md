## Pregunta 0

error: GH013: Repository rule violations found for refs/heads/main.

## Pregunta 1: ¿qué código recibe el cliente con PostgreSQL parado? ¿Qué ves en la terminal que el cliente no ve? ¿Por qué es mejor así?

Con PostgreSQL parado, el cliente recibe HTTP 500 con {"statusCode":500,"message":"Internal server error"}. En la terminal de NestJS aparece el error completo: ECONNREFUSED en ::1:5433 y 127.0.0.1:5433, con la traza de la conexión. Es mejor así porque el cliente no ve detalles internos (puerto, dirección ni traza) y el log del servidor conserva lo necesario para diagnosticar.