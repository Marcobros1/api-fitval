## Resumen

Parte 9 de la entrega (ampliación): **Seguridad y errores**. Se añade helmet, throttler (rate limiting), filtro global de excepciones y trust proxy.

## Cambios

### Código
| Archivo | Cambio |
|---------|--------|
| `src/app.config.ts` | `helmet()` + `trust proxy` para rate limiter detrás de proxy |
| `src/common/all-exceptions.filter.ts` | **NUEVO** - Filtro global: 500 genérico "Error interno del servidor", 404 con formato consistente `{statusCode, timestamp, path, message}` |
| `src/app.module.ts` | `ThrottlerModule.forRoot([{ttl: 60000, limit: 20}])` + `APP_GUARD: ThrottlerGuard` (20 req/min global) |
| `src/auth/auth.controller.ts` | `@Throttle({default: {limit: 5, ttl: 60000}})` en login (5 req/min) |
| `src/main.ts` | `NestExpressApplication` + `AllExceptionsFilter` + `trust proxy` |

### Tests
| Archivo | Cambio |
|---------|--------|
| `test/fitval.e2e-spec.ts` | Ajustes menores para eslint |

## Tabla de pruebas (salidas literales)

### Helmet headers
```bash
curl -i http://localhost:3000/api/v1/health
# Salida: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, X-RateLimit-Limit: 20, etc.
# NO sale X-Powered-By
```

### Rate limiting general (20 req/min)
```bash
for i in {1..25}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/plans; done
# 20×200 → 5×429
```

### Rate limiting login (5 req/min)
```bash
for i in {1..6}; do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"ana@gym.com","password":"wrong"}'; done
# 5×401 → 429
```

### 404 con formato nuevo
```bash
curl -i http://localhost:3000/api/v1/classes/999999
# 404 con {statusCode, timestamp, path, message}
```

### 500 genérico
```bash
docker compose stop postgres
curl -i http://localhost:3000/api/v1/health
# 500 con "Error interno del servidor" (sin detalles internos)
docker compose start postgres
```

### Trust proxy (X-Forwarded-For)
```bash
for i in {1..22}; do curl -s -o /dev/null -w "%{http_code}\n" -H "X-Forwarded-For: 1.2.3.4" http://localhost:3000/api/v1/plans; done
# 20×200 → 429 por IP
```

## Resultados automáticos
- `npm run build`: ✅
- `npm test`: 16 suites, 101 tests ✅
- `npm run test:e2e`: 5 suites, 46 tests ✅
- `npx eslint`: 0 errores (8 warnings preexistentes) ✅

## Próximos pasos
Continuar con Parte 10 (Trainers y especialidades, transacciones).