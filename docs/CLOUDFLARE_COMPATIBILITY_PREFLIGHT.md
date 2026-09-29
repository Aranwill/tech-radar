# Cloudflare Compatibility Preflight

## Estado

Preflight de compatibilidad previo a cualquier migración o despliegue real.

Fecha de baseline: **2026-09-29**.

## Por qué existe

Dalil adoptó Cloudflare Workers como baseline de runtime remoto, pero todavía no debe agregar adaptadores, credenciales, bindings ni recursos de proveedor hasta comprobar que la aplicación Next.js actual es compatible.

Cloudflare recomienda actualmente **vinext** como camino por defecto para aplicaciones Next.js existentes en Workers. OpenNext queda como alternativa para aplicaciones que ya lo usan o que encuentren un gap de compatibilidad con vinext.

Referencias:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://github.com/cloudflare/vinext

## Regla de adopción

Este preflight **no instala vinext en el proyecto** y no cambia el lockfile.

Sólo ejecuta:

```bash
pnpm dlx vinext@1.0.0-beta.9 check
```

La versión se fija deliberadamente para que el resultado sea reproducible.

La versión más reciente observada al crear esta baseline era más nueva que la ventana de enfriamiento de dependencias del proyecto. Dalil mantiene `minimumReleaseAge: 1440`, por lo que no debe adoptar una publicación recién liberada sólo por ser la más reciente.

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
- preflight vinext = PASS o sus incompatibilidades quedan entendidas y aceptadas;
- no aparecen gaps que comprometan las APIs Next.js ya utilizadas por Dalil;
- la versión candidata respeta el cooldown de dependencias.

Si el preflight falla, el fallo se trata como evidencia y se investiga antes de incorporar el adaptador.

## Siguiente paso controlado

Después de aprobar este gate, la siguiente rama deberá ejecutar en un entorno controlado una inicialización no destructiva de Cloudflare/vinext, revisar todos los archivos generados y validar ambos caminos:

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
