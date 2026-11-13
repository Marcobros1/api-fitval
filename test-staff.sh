#!/bin/bash
export DATABASE_URL="postgres://alumno:alumno_dev_123@localhost:5433/fitval"
export JWT_SECRET="fitval_jwt_secret_super_largo_y_aleatorio_2026_xK9mP2qR"
export PORT=3000

cd /Users/Marco/Desktop/CURSO_THE_BRIDGE/api-fitval

# Matar cualquier proceso anterior en el puerto 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Levantar la API en segundo plano
nohup node dist/main.js > /tmp/api-staff.log 2>&1 &
API_PID=$!
echo "API PID: $API_PID"
sleep 4

echo "=== Verificando que la API responde ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/classes

echo ""
echo "=== PRUEBA 1: GET /api/classes, sin token ==="
curl -s -i -X GET http://localhost:3000/api/classes

echo ""
echo "=== PRUEBA 2: POST /api/classes, sin token ==="
curl -s -i -X POST http://localhost:3000/api/classes -H 'Content-Type: application/json' -d '{"activity":"Fuerza","room":"Sala 3","startsAt":"2026-11-10T18:00:00Z","spots":15,"trainerId":4}'

echo ""
echo "=== REGISTRAR Ana (si no existe) ==="
curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"ana@gym.com","password":"12345678"}'

echo ""
echo "=== REGISTRAR recepcion@fitval.com (si no existe) ==="
curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"recepcion@fitval.com","password":"recepcion123"}'

echo ""
echo "=== LOGIN Ana ==="
LOGIN_ANA=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ana@gym.com","password":"12345678"}')
echo "$LOGIN_ANA"
TOKEN_ANA=$(echo "$LOGIN_ANA" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).accessToken)}catch{process.exit(1)}})")

echo ""
echo "=== LOGIN recepción ==="
LOGIN_REC=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"recepcion@fitval.com","password":"recepcion123"}')
echo "$LOGIN_REC"
TOKEN_REC=$(echo "$LOGIN_REC" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).accessToken)}catch{process.exit(1)}})")

echo ""
echo "=== PRUEBA 3: POST /api/classes, token de Ana ==="
curl -s -i -X POST http://localhost:3000/api/classes -H "Authorization: Bearer $TOKEN_ANA" -H 'Content-Type: application/json' -d '{"activity":"Fuerza","room":"Sala 3","startsAt":"2026-11-10T18:00:00Z","spots":15,"trainerId":4}'

echo ""
echo "=== PRUEBA 4: POST /api/classes, token de recepción (todavía es member) ==="
curl -s -i -X POST http://localhost:3000/api/classes -H "Authorization: Bearer $TOKEN_REC" -H 'Content-Type: application/json' -d '{"activity":"Fuerza","room":"Sala 3","startsAt":"2026-11-10T18:00:00Z","spots":15,"trainerId":4}'

echo ""
echo "=== CAMBIANDO ROL DE RECEPCIÓN A staff ==="
docker exec postgres-fitval psql -U alumno -d fitval -c "UPDATE users SET role = 'staff' WHERE email = 'recepcion@fitval.com';"

echo ""
echo "=== PRUEBA 5: POST /api_classes, el mismo token de recepción (ahora es staff) ==="
curl -s -i -X POST http://localhost:3000/api/classes -H "Authorization: Bearer $TOKEN_REC" -H 'Content-Type: application/json' -d '{"activity":"Fuerza","room":"Sala 3","startsAt":"2026-11-10T18:00:00Z","spots":15,"trainerId":4}'

echo ""
echo "=== PRUEBA 6: DELETE /api/classes/1, token de recepción (tiene reservas) ==="
curl -s -i -X DELETE http://localhost:3000/api/classes/1 -H "Authorization: Bearer $TOKEN_REC"

echo ""
echo "=== PRUEBA 7: DELETE /api/classes/6, token de Ana ==="
curl -s -i -X DELETE http://localhost:3000/api/classes/6 -H "Authorization: Bearer $TOKEN_ANA"

echo ""
echo "=== PRUEBA 8: DELETE /api/classes/6, token de recepción ==="
curl -s -i -X DELETE http://localhost:3000/api/classes/6 -H "Authorization: Bearer $TOKEN_REC"

echo ""
echo "=== PARANDO LA API ==="
kill $API_PID 2>/dev/null || true
