# Cloudflare Compatibility Preflight

## Estado

Preflight de compatibilidad previo a cualquier migración o despliegue real.

Fecha de baseline original: **2026-09-29**.  
Refreshes de evidencia: **2026-09-30** y candidate actual **2026-10-04**.

## Por qué existe

Dalil adoptó Cloudflare Workers como baseline de runtime remoto, pero todavía no debe agregar adaptadores, credenciales, bindings ni recursos de proveedor hasta comprobar que la aplicación Next.js actual es compatible.

Cloudflare recomienda actualmente **vinext** como camino por defecto para aplicaciones Next.js existentes en Workers. OpenNext queda como alternativa para aplicaciones que ya lo usan o que encuentren un gap de compatibilidad con vinext.

Referencias:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://github.com/cloudflare/vinext

## Primera medición

El primer run contra el árbol integrado produjo:

```text
Overall: 85% compatible
Config: 2/3 options supported
Libraries: 2/2 compatible
App Router: compatible
1 page: detected
1 layout: detected
1 route handler: detected
```

Hallazgos:

1. **Issue concreto:** faltaba `"type": "module"` en `package.json`. Vinext lo requiere para Vite.
2. **Soporte parcial:** `reactStrictMode` no envuelve todavía el App Router como lo hace Next.js; no bloquea el build, pero queda registrado como diferencia semántica.
3. El comando `vinext check` devolvió exit code 0 aun reportando un issue. Por eso el workflow de Dalil no confía sólo en el código de salida: falla si el reporte contiene incompatibilidades marcadas con `✗`.

## Segunda medición

Después de agregar `"type": "module"` y endurecer el gate, el preflight produjo:

```text
Overall: 94% compatible
8 supported
1 partial
0 issues
```

El único soporte parcial restante es `reactStrictMode` en App Router. El CI general siguió PASS, incluyendo instalación con lockfile congelado, security baseline, typecheck, build y audit de dependencias de producción.

Resultado del gate actual: **PASS con una diferencia parcial conocida y documentada; sin incompatibilidades bloqueantes.**

## Tercera medición — vinext 1.0.0

El refresh del 2026-09-30 contra `vinext@1.0.0` produjo:

```text
Overall: 94% compatible
Config: 2/3 options supported
Libraries: 2/2 compatible
App Router: compatible
1 page: detected
1 layout: detected
1 route handler: detected
8 supported
1 partial
0 issues
```

No aparecieron incompatibilidades nuevas respecto de la segunda medición. El único soporte parcial continúa siendo `reactStrictMode` en App Router.

Resultado del refresh: **PASS; 0 issues bloqueantes.**

## Cuarta medición — vinext 1.0.1 (candidate 2026-10-04)

Upstream publicó `vinext@1.0.1` el 2026-10-01. Al preparar este candidate ya supera la ventana mínima de 24 horas definida por `minimumReleaseAge: 1440`.

La release contiene correcciones relevantes para el camino que Dalil evalúa, entre ellas fixes en Cloudflare, App Router, Router, Build, Cache, NextRequest y middleware. Esto justifica refrescar la sonda antes de decidir una migración real, pero **no autoriza por sí solo a adoptar el runtime**.

Este candidate cambia únicamente la sonda reproducible:

```bash
pnpm dlx vinext@1.0.1 check
```

El resultado terminal de esta cuarta medición queda ligado al CI del candidate exacto de la PR. La PR sólo podrá aceptarse si el workflow general y el preflight de compatibilidad terminan PASS y el reporte no contiene incompatibilidades marcadas con `✗`.

Referencia release:
- https://github.com/cloudflare/vinext/releases/tag/vinext%401.0.1

## Corrección acotada original

La baseline del 2026-09-29 agregó únicamente `"type": "module"` a `package.json`. Ese cambio ya está integrado en `main` y resolvió el issue ESM observado.

## Refreshes versionados

El refresh del 2026-09-30 cambió la sonda de `vinext@1.0.0-beta.9` a `vinext@1.0.0` y produjo la tercera medición documentada.

El candidate actual del 2026-10-04 refresca exclusivamente:

- el pin de la sonda de compatibilidad: `vinext@1.0.0 → vinext@1.0.1`;
- la documentación de evidencia;
- la base Git de la PR para quedar nuevamente construida sobre el `main` actual después de D1 Bootstrap V1.

No modifica `package.json`, `pnpm-lock.yaml`, código de aplicación, D1, credenciales ni configuración de proveedor. Tampoco incorpora vinext como dependencia.

El refresh sólo se acepta si el CI Next.js existente sigue PASS y el nuevo preflight no reporta issues bloqueantes.

## Regla de adopción

Este preflight **no instala vinext en el proyecto** y no cambia el lockfile.

Sólo ejecuta:

```bash
pnpm dlx vinext@1.0.1 check
```

La versión se fija deliberadamente para que el resultado sea reproducible.

La baseline original utilizó una beta fijada. Upstream publicó `vinext@1.0.0` el 2026-09-28 y `vinext@1.0.1` el 2026-10-01. El candidate actual usa 1.0.1 porque ya supera la ventana mínima de 24 horas definida por `minimumReleaseAge: 1440`.

Este refresh **no adopta vinext como dependencia**: únicamente actualiza la sonda reproducible de compatibilidad ejecutada con `pnpm dlx`. La guía de Cloudflare consultada sigue recomendando ejecutar `vinext check` antes de `vinext init`; cualquier diferencia temporal entre esa documentación y los releases upstream se conserva como evidencia y no se interpreta como autorización automática para migrar.

Referencia candidate:
- https://github.com/cloudflare/vinext/releases/tag/vinext%401.0.1

Antes de una migración real se debe volver a comprobar:

1. versión candidata de vinext;
2. antigüedad suficiente según la política del proyecto;
3. changelog y issues relevantes;
4. resultado de `vinext check`;
5. build Next.js actual;
6. build vinext/Cloudflare en una rama aislada.

## Qué comprueba esta rama

- que el árbol actual sigue instalando con lockfile congelado;
- que el chequeo oficial de compatibilidad puede ejecutarse en CI;
- que el resultado queda visible en GitHub Actions;
- que issues marcados por vinext convierten el preflight en fallo real;
- que el requisito ESM no rompe el build Next.js existente;
- que no se requieren secretos ni una cuenta Cloudflare para esta fase;
- que la decisión de migración puede basarse en evidencia antes de generar archivos de proveedor.

## Qué NO hace

- no ejecuta `vinext init`;
- no agrega `vinext`, Vite o plugins Cloudflare al package;
- no modifica `pnpm-lock.yaml`;
- no crea `wrangler.jsonc` ni `cloudflare.config.ts`;
- no crea Workers, D1, R2 ni Analytics Engine;
- no solicita `CLOUDFLARE_API_TOKEN`;
- no despliega nada;
- no altera `main`.

## Gate para la siguiente etapa

Sólo se prepara la migración real si:

- CI general = PASS;
- preflight vinext sin issues `✗`;
- cualquier soporte parcial queda entendido y documentado;
- no aparecen gaps que comprometan las APIs Next.js ya utilizadas por Dalil;
- la versión candidata respeta el cooldown de dependencias.

Si el preflight falla, el fallo se trata como evidencia y se investiga antes de incorporar el adaptador.

## Siguiente paso controlado

Después de aprobar este gate, la siguiente rama podrá preparar una inicialización no destructiva de Cloudflare/vinext, revisar todos los archivos generados y validar ambos caminos. La ejecución que requiera autenticación, Account ID, tokens, bindings o recursos reales permanece reservada para la workstation personal autorizada:

```text
Next.js actual
    |
    +--> pnpm build

vinext / Workers
    |
    +--> compatibility check
    +--> build Cloudflare
    +--> preview local
```

El primer deploy real requiere acción humana para autenticar Cloudflare y sigue fuera de este preflight.
