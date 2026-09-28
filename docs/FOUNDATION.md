# Foundation 0.1

## Objetivo

Construir una base pequeña, desplegable y entendible para un radar global de información tecnológica. Esta etapa no intenta resolver ingestión, ranking ni IA: establece la interfaz, los contratos y los límites de seguridad.

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

## Criterios para cerrar Foundation

1. `package-lock.json` versionado.
2. Typecheck PASS.
3. Build de producción PASS.
4. Auditoría de dependencias de producción sin vulnerabilidades altas conocidas.
5. Revisión manual responsive claro/oscuro.
6. Revisión de headers de seguridad.
7. Sin secretos o archivos locales en Git.
