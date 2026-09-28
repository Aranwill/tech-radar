# Threat Model V1

## Activos

- integridad de la información mostrada;
- secretos server-side futuros;
- disponibilidad del servicio;
- procedencia y enlaces originales;
- pipeline CI/CD y dependencias;
- confianza del usuario en métricas, resúmenes y señales.

## Trust boundaries

Internet y fuentes externas son NO CONFIABLES.

Flujo actual:

fuente externa -> server-side fetch -> validación/límites/allowlist -> modelo de dominio -> contrato UI estructurado -> React/navegador.

Cuando exista IA se agrega una nueva frontera:

contenido externo NO CONFIABLE -> preprocesamiento/provenance -> LLM con output NO CONFIABLE -> validación determinista -> UI permitida o policy/aprobación para acciones.

## Amenazas actuales prioritarias

### Supply chain

Dependencias o Actions comprometidas pueden ejecutar código durante build/CI.

Controles: lockfile, pnpm exacto, cooldown, subdependencias exóticas bloqueadas, audit, Dependabot, Actions por SHA y credenciales de checkout no persistentes.

### Datos externos maliciosos

Una API o fuente puede devolver campos inesperados, payloads enormes o enlaces no permitidos.

Controles: host/endpoint fijo, timeout, redirect bloqueado, content-type, límite de bytes, Zod, URLs HTTPS/host esperado y React escaping.

### XSS / UI injection

Contenido externo podría intentar convertirse en código o markup.

Controles: no dangerouslySetInnerHTML, no eval, componentes locales allowlisted, CSP y checks automáticos.

### SSRF

Una futura entrada controlada por usuario podría intentar convertir el backend en proxy.

Estado actual: no existen URLs de fetch controladas por usuario; GitHub Source V1 usa una lista local cerrada. Cualquier fuente dinámica futura requiere parser de URL, allowlist de scheme/host, bloqueo de IPs internas y redirecciones controladas.

### Denial of service / unbounded consumption

Fuentes lentas o payloads grandes pueden consumir recursos.

Controles actuales: timeout, respuesta máxima, caché y conjunto limitado de requests. Antes de búsqueda pública se requerirá rate limit y cuotas.

### Errores y leakage

Errores upstream pueden revelar implementación, secretos o tokens.

Controles: respuesta pública genérica, logs sin Authorization y sin body externo, y degradación parcial cuando es posible.

## Amenazas futuras de IA

No se considera seguro conectar un LLM simplemente porque el input haya sido sanitizado. Prompt injection no tiene una defensa perfecta a nivel de modelo. Por diseño se limita el impacto: contexto mínimo, output no confiable, tools con mínimo privilegio, human approval para efectos relevantes, sin secretos en prompts y budgets estrictos.

## Riesgos residuales conocidos

- La CSP aún usa unsafe-inline para scripts/estilos necesarios por la Foundation de Next.js. Antes del despliegue estable se debe evaluar CSP basada en nonce/hash.
- No existe todavía rate limiting distribuido porque no hay endpoints de búsqueda pública ni mutaciones.
- No hay observabilidad/alerting externo configurado.
- Private vulnerability reporting debe verificarse/habilitarse en GitHub antes de anunciar un canal de reporte confidencial.
