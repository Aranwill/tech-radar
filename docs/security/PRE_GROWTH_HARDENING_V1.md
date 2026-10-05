# DALIL · Pre-Growth Security Hardening V1

Fecha de relevamiento: 2026-10-05

## Objetivo

Endurecer DALIL antes de ampliar fuentes, endpoints, D1 runtime o capacidades de IA. Este documento registra findings, cierres y trabajo diferido. No constituye una certificación de seguridad.

## Baseline revisado

- `main`: `9ab1101c048159e070776dc384a8f147d1df619d`
- runtime vinext candidate PR #35: `9aa8d104477c9f20554bcdd3d9f226ab09262260`
- alcance: `src/`, `scripts/`, workflows, dependencias, CSP/headers, D1 snapshot pipeline, UI estructurada y configuración Cloudflare/vinext.

## Findings

| ID | Severidad | Estado | Resumen |
| --- | --- | --- | --- |
| DALIL-SEC-01 | HIGH | BLOCKED-UPSTREAM | `braces@3.0.3` stack exhaustion vía dependencia transitiva de vinext. Upstream aún no publicó release corregido. |
| DALIL-SEC-02 | HIGH | CLOSED-IN-CODE | Secrets D1 estaban disponibles a nivel job completo; se limitan al step de persistencia. |
| DALIL-SEC-03 | HIGH | CLOSED-IN-CODE | Persistencia manual D1 podía solicitarse desde otra branch; ahora se rechaza fuera de `refs/heads/main`. |
| DALIL-SEC-04 | MEDIUM-HIGH | CLOSED-IN-CODE | El límite de body se verificaba después de `arrayBuffer()`; ahora el stream se corta al superar el máximo. |
| DALIL-SEC-05 | MEDIUM | CLOSED-IN-CI | CI incorpora `build:vinext` además del build Next.js. |
| DALIL-SEC-06 | MEDIUM | CLOSED-IN-CI | Preflight deja de ejecutar `pnpm dlx`; usa vinext fijado por el lockfile. |
| DALIL-SEC-07 | MEDIUM | PARTIAL | CI audita grafo completo desde severidad moderate. Quedan advisories upstream abiertas. |
| DALIL-SEC-08 | MEDIUM | CLOSED-IN-CODE | GitHub URLs pasan de hostname permisivo a origin HTTPS exacto sin userinfo/puerto. |
| DALIL-SEC-09 | MEDIUM | CLOSED-IN-CODE | Runtime verifica que `full_name` corresponda al repositorio curado solicitado. |
| DALIL-SEC-10 | MEDIUM | CLOSED-IN-CODE | Concurrencia de repositorios se limita a 4 por lote. |
| DALIL-SEC-11 | MEDIUM | CLOSED-IN-CODE | El core rechaza snapshots fuera del bucket UTC exacto de 6h. |
| DALIL-SEC-12 | MEDIUM | CLOSED-IN-CODE | CSP/Permissions eliminan capacidades todavía no utilizadas. |
| DALIL-SEC-13 | LOW-MEDIUM | CLOSED-IN-CODE | El cliente valida con Zod la respuesta de su API antes de renderizar. |
| DALIL-SEC-14 | LOW | CLOSED-IN-CODE | Enlaces externos usan `noopener noreferrer`. |
| DALIL-SEC-15 | LOW-MEDIUM | CLOSED-IN-CODE | Security baseline amplía cobertura a scripts/config/workflows e invariantes. |
| DALIL-SEC-16 | INTEGRITY | CLOSED-IN-CODE | `fetchedAt` se reemplaza por `servedAt` para no afirmar frescura que puede provenir de caché. |
| DALIL-SEC-17 | PLATFORM | PENDING-CONFIG | No hay Repository Rulesets visibles. Branch Protection requiere verificación manual por permisos. |
| DALIL-SEC-18 | MODERATE | PENDING-LOCKFILE | `fflate@0.7.3` es vulnerable; existe fix en `0.7.5`. Sus padres lo fijan a 0.7.3, por lo que requiere override + lockfile controlado. |
| DALIL-SEC-19 | MEDIUM | PENDING-DEPLOY-CONFIG | `/api/github/repositories` es público. Catálogo/caché/concurrencia reducen consumo, pero el deploy estable requiere rate limiting distribuido. |

## Supply chain pendiente

### braces

Cadena observada:

```text
vinext
  -> vite-plugin-commonjs
  -> vite-plugin-dynamic-import
  -> fast-glob
  -> micromatch
  -> braces@3.0.3
```

Advisory: `GHSA-vfj7-8cjw-p6xm`.

No hay versión publicada corregida en el audit observado. No se debe silenciar la advisory ni bajar el nivel de audit. La mitigación final requiere release upstream o patch local explícito, reproducible y acompañado de una prueba de profundidad.

### fflate

Cadena observada por vinext / `@vercel/og` / satori.

- vulnerable: `fflate@0.7.3`
- patched: `>=0.7.5`
- advisory: `GHSA-px8p-9vwx-vf98`

Satori 0.33.5 y `@shuding/opentype.js@1.4.0-beta.0` fijan exactamente `fflate: 0.7.3`, por lo que un update transitivo ordinario no alcanza. La sesión controlada debe aplicar un override exacto a `0.7.5`, regenerar el lockfile y ejecutar la validación completa.

## Invariantes nuevos

- D1 write desde GitHub Actions sólo puede ejecutarse desde `refs/heads/main`.
- Los secrets D1 no existen en el environment global del job.
- Respuestas JSON externas tienen límite real de bytes durante streaming.
- GitHub Source usa orígenes HTTPS exactos y provenance del repo solicitado.
- Máximo de cuatro repositorios procesados concurrentemente por lote.
- Snapshots persistibles deben caer en buckets UTC exactos de 6h.
- `pull_request_target`, `npx` y `pnpm dlx` están prohibidos por el baseline actual.
- Actions de terceros permanecen fijadas a SHA.
- La UI no acepta HTML/JS arbitrario ni navegación `_blank` sin aislamiento.
- Geolocation y conexiones browser a proveedores todavía no usados permanecen deshabilitadas.

## Validación pendiente en PC personal

Cuando el propietario vuelva a su PC personal:

1. regenerar lockfile para corregir `fflate`;
2. decidir y validar mitigación de `braces`;
3. `pnpm install --frozen-lockfile`;
4. suite de validadores;
5. `pnpm build`;
6. `pnpm build:vinext`;
7. `pnpm start:vinext` y parity E2E;
8. revisión de Rulesets / Branch Protection;
9. configurar/verificar rate limiting distribuido para endpoints públicos antes del deploy estable;
10. recién después, cualquier deploy o configuración de D1 runtime.

## Fuera de alcance

- deploy;
- cambios en D1 remota;
- rotación/modificación de secrets;
- configuración de Cloudflare;
- autenticación;
- IA/LLM;
- nuevas fuentes.
