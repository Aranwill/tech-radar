# Foundation 0.1

## Identidad

El producto se llama **Dalil** (`دليل`, transliterado `Dalīl` o `Dalil`).

Para este proyecto se adopta el sentido de **guía / indicio / evidencia**: una herramienta para orientarse entre señales tecnológicas, conservar procedencia y facilitar el acceso a las fuentes originales.

El nombre técnico del repositorio puede seguir siendo `tech-radar` durante la etapa de construcción; cualquier migración de nombres técnicos se decidirá y ejecutará por separado.


## Objetivo

Construir una base pequeña, desplegable y entendible para un radar global de información tecnológica. Esta etapa no intenta resolver ingestión, ranking ni IA: establece la interfaz, los contratos y los límites de seguridad.

## Toolchain

- Node.js 20.19+.
- pnpm 11.28.0 fijado en `package.json`.
- No se usa npm como package manager del proyecto.
- `pnpm-workspace.yaml` concentra la política local de dependencias.
- `minimumReleaseAge: 1440` introduce una espera de 24 horas antes de adoptar versiones nuevas.
- `blockExoticSubdeps: true` impide fuentes transitivas Git/tarball fuera del registry.
- `saveExact: true` evita rangos nuevos en dependencias directas.
- `next-env.d.ts` es generado por Next.js y no se versiona.
- El typecheck ejecuta `next typegen` antes de `tsc --noEmit`.

El cambio a pnpm no elimina el riesgo del registry npm: la defensa depende también del lockfile, revisión de cambios, auditoría, permisos mínimos y políticas de instalación.

## Alcance V1

- PWA responsive y mobile-first.
- Tema claro, oscuro y sistema.
- Must Read y verticales: IA, Research, Big Tech, GitHub/Open Source, Hugging Face, Cyber y Tech.
- Ventanas temporales: Hoy, 7 días y 30 días.
- Historias agrupadas por tema para evitar duplicados.
- Fuente original siempre visible.
- GitHub Emerging / Popular / New & Interesting con snapshots propios.
- Clima como contexto, nunca como vertical.
- Gráficos y estadísticas sólo cuando aporten información.
- Observabilidad geográfica agregada por país, sin IP ni fingerprinting, cuando existan métricas reales de producción.

## Arquitectura inicial

```text
fuentes externas
     |
     v
GitHub Actions
scheduler + processing
     |
     v
ingestión / normalización
     |
     v
deduplicación + stories
     |
     v
ranking + snapshots + evidence
     |
     +--------> Cloudflare R2
     |
     v
Cloudflare D1
     |
     v
Cloudflare Worker / API propia
     |
     v
contrato UI estructurado
     |
     v
catálogo React permitido
     |
     v
PWA / Static Assets
```

La Foundation implementa hoy desde `contrato UI estructurado` hacia abajo y ya dispone de GitHub como primer datasource real. La evolución de V1 adopta Cloudflare + GitHub Actions como baseline de infraestructura remota para que disponibilidad, persistencia e ingestión no dependan de un dispositivo del usuario.

Los contratos de dominio deben permanecer desacoplados de los SDKs del proveedor para conservar una vía de migración futura.

Ver [CLOUD_RUNTIME_OBSERVABILITY_V1.md](CLOUD_RUNTIME_OBSERVABILITY_V1.md).

## A2UI / MCP Apps

A2UI es una referencia técnica y un laboratorio, no una dependencia crítica de la V1. El dominio de la aplicación mantiene su propio contrato pequeño. Esto permite experimentar con renderers A2UI sin acoplar la disponibilidad del producto a un estándar todavía evolutivo.

MCP Apps queda fuera del camino crítico. Podrá explorarse más adelante para exponer experiencias interactivas a hosts compatibles.

## Hosting

La baseline V1 selecciona:

- Cloudflare Static Assets para frontend;
- Cloudflare Workers para API/runtime HTTP acotado;
- Cloudflare D1 como persistencia relacional inicial;
- Cloudflare R2 para object storage cuando sea necesario;
- Workers Analytics Engine para telemetría operativa agregada;
- GitHub Actions para scheduler y procesamiento remoto.

La selección se adopta para comenzar dentro de free tiers y mantener Dalil independiente de una PC personal. Los límites gratuitos son restricciones operativas que deben revalidarse antes de cada ampliación relevante.

No se habilitará gasto automático para ocultar un exceso de cuota.

## Seguridad

La aplicación parte de deny-by-default para UI generativa: los datos seleccionan únicamente componentes del catálogo local. No existe una ruta desde datos externos hacia ejecución arbitraria de HTML o JavaScript.

La CSP actual permite scripts y estilos inline porque Next.js los necesita en esta Foundation. Endurecer con nonces/hashes queda como tarea previa a exposición pública.

Para dependencias, pnpm se fija a una versión concreta, se configura una ventana mínima de publicación y bloqueo de fuentes transitivas exóticas, y el CI usa `pnpm install --frozen-lockfile` sobre el `pnpm-lock.yaml` versionado.

## Criterios para cerrar Foundation

1. `pnpm-lock.yaml` versionado y revisado.
2. CI usando `pnpm install --frozen-lockfile`.
3. `pnpm typecheck` PASS con generación previa de tipos Next.js.
4. Build de producción PASS.
5. `pnpm audit --prod --audit-level=high` PASS.
6. Evaluar y, si resulta compatible con el árbol, incorporar verificación de firmas del registry.
7. Revisión manual responsive claro/oscuro.
8. Revisión de headers de seguridad.
9. Sin secretos o archivos locales en Git.
