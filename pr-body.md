## Resumen

Parte 6 de la entrega (ampliación): **tests unitarios con Jest**. Se añade el test unitario del `StaffGuard` que faltaba (ejercicio 6.7) y se ajusta el guard para distinguir entre los dos casos de error.

## Cambios

### `src/auth/staff.guard.ts` (modificado)
Se añade la distinción entre dos situaciones de error:
| Situación | Excepción | HTTP |
|-----------|-----------|------|
| Usuario no existe en BD | `UnauthorizedException` | **401** |
| Usuario existe pero es `member` | `ForbiddenException` | **403** |

Antes lanzaba `ForbiddenException` en ambos casos. Ahora si `findById` devuelve `undefined`, lanza 401; si devuelve un `member`, lanza 403.

### `src/auth/staff.guard.spec.ts` (nuevo)
3 tests unitarios para el `StaffGuard` (ejercicio 6.7):
| Test | `findById` responde | Resultado esperado |
|------|---------------------|--------------------|
| Deja pasar al personal | `{ id: 1, role: 'staff' }` | `resolves.toBe(true)` |
| No deja pasar a un socio | `{ id: 1, role: 'member' }` | `ForbiddenException` (403) |
| Usuario ya no existe | `undefined` | `UnauthorizedException` (401) |

## Resultados de pruebas

- `npm run build`: ✅
- `npm test`: **15 suites, 88 tests en verde** (antes eran 85, ahora 88 con los 3 nuevos)
- `npm run test:e2e`: ✅ (contra PostgreSQL real)

## Próximos pasos

Esta rama cierra el test unitario del `StaffGuard` de la Parte 6. Las siguientes partes de la ampliación (7 a 13) se harán en ramas `feature/...` separadas, cada una con su propia PR.

No fusiono hasta que revises el resultado.
