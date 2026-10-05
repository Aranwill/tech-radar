# DALIL · Security Closure Checklist

Este checklist se usa únicamente después del hardening remoto de 2026-10-05.

## Estado de partida

PRs:

- #35 — runtime Cloudflare / vinext V1
- #37 — security hardening pre-crecimiento

Candidate de #37 debe verificarse nuevamente antes de ejecutar pasos locales.

## 1. Sincronización local

En la PC personal:

```powershell
cd D:\tech-radar
git fetch --all --prune
git switch security/pre-growth-hardening-v1-20261005
git pull --ff-only
git status
```

Esperado: working tree limpio.

## 2. GitHub Dependency Graph

En GitHub:

`Settings -> Security -> Advanced Security / Security analysis`

Habilitar Dependency Graph si sigue deshabilitado.

Después, reejecutar **Dependency review** sobre la PR #37.

Criterio: el job debe ejecutar el análisis real; no usar `warn-only`.

## 3. fflate

Finding:

- package vulnerable: `fflate@0.7.3`
- advisory: `GHSA-px8p-9vwx-vf98`
- patched: `>=0.7.5`

Satori y `@shuding/opentype.js` fijan `0.7.3`, por lo que se requiere un override controlado.

Antes de modificar:

```powershell
pnpm why fflate
pnpm audit --audit-level=moderate
```

Aplicar override exacto a `0.7.5`, regenerar lockfile con pnpm y volver a inspeccionar el diff.

No editar el lockfile manualmente.

## 4. braces

Finding:

- package vulnerable: `braces@3.0.3`
- advisory: `GHSA-vfj7-8cjw-p6xm`
- upstream observado sin release corregido.

Orden de preferencia:

1. release oficial corregido;
2. si no existe, `pnpm patch` local mínimo basado en el fix upstream revisado;
3. acompañar el patch con prueba de regresión que rechace profundidad >100;
4. no usar `allow-ghsas`, ignore de audit o reducción de severidad para ocultar el finding.

No introducir dependencia git/exótica para resolver este finding.

## 5. Instalación reproducible

Después de resolver supply chain:

```powershell
pnpm install --frozen-lockfile
pnpm audit --audit-level=moderate
```

Esperado:

```text
0 vulnerabilities at moderate or above
```

## 6. Gates locales

```powershell
pnpm security:baseline
pnpm schema:validate
pnpm d1:config:validate
pnpm d1:verify:syntax
pnpm snapshot:validate
pnpm history:validate
pnpm http:bounded-json:validate
pnpm typecheck
pnpm build
pnpm build:vinext
```

Todos deben terminar en PASS.

## 7. Runtime parity local

```powershell
pnpm start:vinext
```

Validar:

- `/` = 200;
- `/api/github/repositories` = 200;
- tres repositorios curados;
- `partial` boolean;
- `servedAt` ISO;
- CSS/assets correctos;
- POST a `/api/github/repositories` = 405;
- headers de seguridad presentes;
- sin `X-Powered-By`;
- sin CORS abierto.

## 8. CodeQL

Confirmar que el job `codeql` de CI ejecute:

- JavaScript/TypeScript;
- `security-extended`;
- upload SARIF correcto.

Revisar la pestaña Security / Code scanning para confirmar si existen alerts abiertos. Un job PASS no se interpreta por sí solo como cero alerts.

## 9. Branch protection / Ruleset

Propuesta para `main` a revisar manualmente antes de activar:

- requerir PR para merge;
- bloquear force push;
- bloquear delete;
- requerir branch up-to-date antes de merge si no interfiere con el flujo móvil;
- requerir CI;
- requerir Cloudflare compatibility preflight;
- requerir CodeQL;
- requerir Dependency Review cuando Dependency Graph esté habilitado.

No activar una regla que impida al propietario realizar su flujo normal sin revisarla primero.

## 10. CSP nonce

Residual risk:

`script-src 'unsafe-inline'` permanece en producción.

Vinext tiene soporte explícito de nonce CSP, pero la migración a nonce por request altera render/cache y debe tratarse como cambio arquitectónico separado con medición de impacto.

No mezclarla con el cierre de supply chain.

## 11. Cloudflare Operations

Antes del primer deploy estable, ejecutar el plan:

`docs/security/CLOUDFLARE_OPERATIONS_HARDENING_V1.md`

Pendientes mínimos:

- verificar límites reales del plan activo;
- configurar rate limiting de `/api/github/repositories`;
- validar requests/period + mitigation timeout;
- activar Workers Observability / Logs;
- crear dashboard `DALIL — Operations`;
- crear dashboard `DALIL — Security` si aporta valor;
- configurar alertas Email;
- evaluar Webhook;
- activar DDoS / SSL / billing notifications disponibles;
- configurar Custom Alerts para 5xx, Worker errors, 429, WAF blocks y anomalías si el dataset lo permite;
- ejecutar prueba controlada del límite;
- documentar rollback.

Baseline propuesto para la primera regla Free:

```text
Path: /api/github/repositories
Characteristic: IP
Threshold: 20 requests / 10 seconds / IP
Action: Block
Mitigation timeout: 10 seconds
```

El valor debe validarse con tráfico real antes de considerarlo permanente.

## 12. Deploy gate

Antes del primer deploy estable:

- dependency audit limpio;
- Dependency Review operativo;
- CodeQL revisado;
- Branch Protection / Ruleset decidido;
- rate limiting distribuido para endpoints públicos;
- D1 runtime binding de solo lectura separado de credenciales administrativas.

Sólo después continuar con History API V1 y nuevas fuentes.
