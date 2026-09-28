# Security

## Estado

El repositorio es público. La aplicación todavía no está desplegada como servicio de producción.

## Principios

- Secretos sólo del lado servidor y nunca versionados.
- Entradas externas validadas antes de persistir o renderizar.
- UI estructurada mediante catálogo explícito de componentes.
- No se permite HTML, JavaScript, componentes remotos ni `eval()` provenientes de fuentes o modelos.
- URLs externas del contrato de UI deben usar HTTPS.
- Endpoints de ingestión usan allowlists, timeouts, límites de tamaño y mitigación SSRF.
- Permisos de GitHub Actions mínimos por defecto.
- Actions de terceros fijadas a commits inmutables.
- Dependencias auditadas y actualizadas de manera controlada.
- pnpm fijado a versión exacta; no se usa npm como package manager del proyecto.
- Versiones recién publicadas tienen un cooldown mínimo de 24 horas salvo excepción explícita y revisada.
- Dependencias transitivas no pueden resolver fuentes Git/tarball exóticas.
- El lockfile es obligatorio y el CI usa instalación congelada.
- Logs sin credenciales, tokens ni contenido sensible.

## Reporte de vulnerabilidades

No abrir Issues públicas con detalles explotables de una vulnerabilidad.

Usar GitHub Security Advisories desde la pestaña **Security** del repositorio para reportes privados. Si esa opción no estuviera disponible, contactar al propietario del repositorio de forma privada.
