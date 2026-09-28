# Foundation 0.1

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

## Arquitectura inicial

```text
fuentes externas
     |
     v
ingestión / normalización
     |
     v
deduplicación + stories
     |
     v
ranking + snapshots
     |
     v
PostgreSQL
     |
     v
API propia
     |
     v
contrato UI estructurado
     |
     v
catálogo React permitido
     |
     v
PWA
```

La Foundation implementa desde `contrato UI estructurado` hacia abajo usando datos de demostración.

## A2UI / MCP Apps

A2UI es una referencia técnica y un laboratorio, no una dependencia crítica de la V1. El dominio de la aplicación mantiene su propio contrato pequeño. Esto permite experimentar con renderers A2UI sin acoplar la disponibilidad del producto a un estándar todavía evolutivo.

MCP Apps queda fuera del camino crítico. Podrá explorarse más adelante para exponer experiencias interactivas a hosts compatibles.

## Hosting

La decisión final de proveedor se mantiene abierta. El diseño debe poder ejecutarse en servicios gratuitos durante la etapa inicial y evitar dependencias innecesarias de proveedor.

## Seguridad

La aplicación parte de deny-by-default para UI generativa: los datos seleccionan únicamente componentes del catálogo local. No existe una ruta desde datos externos hacia ejecución arbitraria de HTML o JavaScript.

La CSP actual permite scripts y estilos inline porque Next.js los necesita en esta Foundation. Endurecer con nonces/hashes queda como tarea previa a exposición pública.

Para dependencias, pnpm se fija a una versión concreta y se configura una ventana mínima de publicación y bloqueo de fuentes transitivas exóticas. Una vez generado `pnpm-lock.yaml`, CI pasará obligatoriamente a instalación congelada.

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
