# Security

## Estado

El proyecto se encuentra en Foundation y todavía no está publicado como servicio.

## Principios

- Secretos sólo del lado servidor y nunca versionados.
- Entradas externas validadas antes de persistir o renderizar.
- UI estructurada mediante catálogo explícito de componentes.
- No se permite HTML, JavaScript, componentes remotos ni `eval()` provenientes de fuentes o modelos.
- URLs externas del contrato de UI deben usar HTTPS.
- Endpoints futuros de ingestión tendrán allowlists, timeouts, límites de tamaño y mitigación SSRF.
- Permisos de GitHub Actions mínimos por defecto.
- Dependencias auditadas y actualizadas de manera controlada.
- pnpm fijado a versión exacta; no se usa npm como package manager del proyecto.
- Versiones recién publicadas tienen un cooldown mínimo de 24 horas salvo excepción explícita y revisada.
- Dependencias transitivas no pueden resolver fuentes Git/tarball exóticas.
- El lockfile será obligatorio y congelado en CI al cerrar Foundation.
- Logs sin credenciales, tokens ni contenido sensible.

## Reporte de vulnerabilidades

Mientras el repositorio sea privado, reportar directamente al propietario. Antes de hacerlo público se habilitará un canal de divulgación responsable mediante GitHub Security Advisories.

No abrir Issues públicas con detalles explotables de una vulnerabilidad.
