# DALIL · Cloudflare Operations & Abuse Protection V1

Fecha de diseño: 2026-10-05

## Objetivo

Dejar definido el baseline operacional de Cloudflare antes del primer deploy estable de DALIL.

Este documento cubre:

- rate limiting y mitigación de abuso;
- tiempo de bloqueo/throttling después de exceder límites;
- observabilidad de Workers;
- dashboards de tráfico y seguridad;
- alertas/notificaciones;
- criterios para escalar controles cuando aumente el tráfico.

No se aplica ninguna configuración desde esta rama. La activación se realiza manualmente en Cloudflare después de validar el deploy y observar tráfico real.

## Principios

1. No depender de una sola barrera.
2. Bloquear abuso antes de que llegue al código siempre que sea posible.
3. No usar límites tan agresivos que bloqueen usuarios legítimos.
4. Medir primero y ajustar con evidencia.
5. Mantener observabilidad suficiente para distinguir ataques, bots, errores y crecimiento legítimo.
6. Preferir configuraciones reversibles y con rollback simple.
7. No exponer secretos administrativos dentro del Worker.

## Capa 1 · Cloudflare WAF Rate Limiting

Primera regla propuesta para el plan Free:

- Scope: `/api/github/repositories`.
- Característica: IP.
- Periodo: 10 segundos.
- Umbral inicial propuesto: 20 requests / 10 segundos / IP.
- Acción inicial: Block.
- Mitigation timeout: 10 segundos.
- No crear excepciones silenciosas por User-Agent.

Motivo del umbral inicial:

La UI normal de DALIL realiza una única lectura del endpoint por carga. Veinte requests en diez segundos desde una única IP ya representa un patrón muy por encima del uso interactivo esperado, pero deja margen para refreshes, NAT compartido y pruebas manuales.

Este valor es un baseline, no una constante permanente.

### Gate antes de activar

Antes de desplegar la regla:

1. observar tráfico real;
2. revisar p95/p99 de requests por cliente;
3. simular bursts legítimos;
4. comprobar que assets y navegación normal no incrementen el contador del endpoint;
5. verificar comportamiento ante 429/1015;
6. guardar captura/export de la configuración aplicada.

### Escalado por plan

Si el plan permite más reglas:

- Regla A — API pública: límite estricto por ruta.
- Regla B — navegación general: límite más alto para bursts anómalos.
- Regla C — endpoints costosos futuros: límite específico por recurso.

No aplicar un límite global bajo sobre assets estáticos o navegación ordinaria.

## Capa 2 · Workers Rate Limiting Binding

Mantener como defensa complementaria futura.

Uso previsto:

- límites por endpoint;
- límites por usuario/tenant cuando exista autenticación;
- protección de rutas especialmente costosas;
- respuesta explícita `429 Too Many Requests`;
- emisión de evento observable `rate_limited`.

No utilizar IP como clave interna cuando exista un identificador estable de usuario, porque NAT, redes móviles y proxies pueden agrupar varios usuarios legítimos bajo una misma IP.

Los contadores de Workers Rate Limiting son locales a la ubicación de Cloudflare y no deben usarse como sistema exacto de cuotas o billing.

## Capa 3 · DDoS / WAF / Security Analytics

Antes del primer deploy estable:

- revisar Security Analytics;
- revisar Security Events;
- confirmar protecciones DDoS administradas disponibles;
- verificar Browser Integrity Check / detecciones disponibles;
- revisar tráfico automatizado cuando Bot Analytics esté disponible en el plan;
- documentar cualquier excepción creada.

Security Analytics será la vista principal para tráfico completo.

Security Events será la vista de requests mitigados o marcados por controles de seguridad.

## Observabilidad de Workers

Activar Workers Observability / Workers Logs si está disponible para el Worker desplegado.

Métricas mínimas a observar:

- requests totales;
- success;
- errors;
- subrequests;
- 4xx;
- 5xx;
- `429`;
- CPU time;
- wall time;
- duration;
- exceptions;
- exceeded resources;
- upstream failures hacia GitHub;
- latencia del datasource GitHub;
- rate-limit events.

No registrar secretos, Authorization headers, API tokens ni payloads sensibles.

## Dashboards Cloudflare

Crear un Custom Dashboard principal:

### `DALIL — Operations`

Charts mínimos:

1. Requests por minuto/hora.
2. Requests por status code.
3. 4xx vs 5xx.
4. Top paths.
5. Requests por país.
6. Requests por ASN cuando esté disponible.
7. Bandwidth / data transfer.
8. Cache hit vs miss cuando aplique.
9. Worker success vs errors.
10. Worker CPU time.
11. Worker wall time / duration.
12. WAF blocks/challenges.
13. Rate-limit blocks / 429.
14. Security events por servicio/regla.
15. GitHub upstream failures desde Workers Logs.
16. Exceeded resources.
17. D1 request/query metrics cuando estén disponibles en el dataset del plan.

### `DALIL — Security`

Crear una segunda vista si la cuenta/plan lo permite:

- WAF actions;
- rate-limit events;
- suspicious/bot traffic;
- top source IP/ASN/country;
- top attacked paths;
- DDoS events;
- 403 / 429;
- anomalías de volumen;
- spikes por región;
- Worker exceptions correlacionadas con tráfico.

## Alertas / notificaciones

Configurar primero Email.

Agregar Webhook sólo cuando exista un destino mantenido y protegido.

Alertas objetivo:

### Built-in, si están disponibles

- DDoS attack detected;
- SSL/TLS certificate / expiration;
- billing / usage anomaly;
- platform/service incidents relevantes.

### Custom Alerts, si el dataset está disponible

- Worker 5xx por encima de baseline;
- Worker exceptions > 0 sostenidas;
- spike anómalo de requests;
- porcentaje de 429 alto;
- aumento de WAF blocks;
- exceeded resources;
- CPU/wall time anómalo;
- GitHub upstream failure rate;
- D1 error rate;
- error ratio > threshold durante varias ventanas consecutivas.

Evitar alertas demasiado sensibles que generen ruido.

Preferir condición sostenida o múltiples ventanas cuando Cloudflare lo permita.

## Umbrales iniciales

No congelar umbrales definitivos antes de tener tráfico.

Baseline inicial:

### API rate limit

```text
/api/github/repositories
20 requests / 10 seconds / IP
mitigation: 10 seconds
```

### Alertas operacionales iniciales

Propuesta después del primer baseline:

- cualquier spike de 5xx sostenido;
- `exceededResources > 0`;
- errores Worker sostenidos;
- tasa de 429 inesperadamente alta;
- crecimiento de tráfico varias veces superior al baseline;
- DDoS alert inmediata;
- certificado próximo a expiración;
- consumo/billing fuera del patrón esperado.

Los porcentajes exactos se fijan después de observar al menos tráfico real inicial y evitar falsos positivos.

## Baseline de capacidad y crecimiento

Registrar periódicamente:

- requests/día;
- requests pico/minuto;
- usuarios/cliente únicos cuando sea medible de forma no invasiva;
- p50/p95/p99 de latency;
- error rate;
- 429 rate;
- WAF block rate;
- bandwidth;
- Worker CPU/wall time;
- D1 reads/writes;
- GitHub API failures;
- cache hit ratio.

Cuando un indicador se acerque a un límite del plan, documentar el límite antes de decidir un upgrade.

## Retención / logs

Usar dashboards y Workers Logs como primera capa.

No habilitar exports/logging de pago automáticamente.

Si el tráfico crece y necesitamos investigación histórica precisa, evaluar:

- Logpush;
- OpenTelemetry export;
- Workers Traces;
- Analytics Engine para eventos propios;
- almacenamiento histórico externo.

Toda activación que pueda generar costo debe pasar por revisión humana previa.

## Custom Dashboards

Cloudflare Custom Dashboards se usarán para consolidar:

- HTTP traffic;
- Security Events;
- Workers Observability;
- Worker errors;
- WAF / rate limiting;
- performance.

No asumir disponibilidad de todos los datasets: verificar en la cuenta qué campos y retención expone el plan activo.

## Gate de deploy

El primer deploy estable de DALIL no se considera operacionalmente cerrado hasta validar:

- rate limiting activo;
- Security Analytics visible;
- Security Events visible;
- Workers Observability activo;
- dashboard DALIL Operations creado;
- notificaciones mínimas activas;
- prueba controlada de rate limit;
- prueba controlada de 429/bloqueo;
- prueba de Worker error observable;
- ninguna alerta contiene secretos;
- rollback de reglas documentado.

## Trabajo pendiente en PC / Cloudflare Dashboard

1. entrar al dashboard Cloudflare;
2. verificar plan y límites reales habilitados;
3. revisar Security Analytics antes de crear reglas;
4. crear rate limiting rule inicial;
5. probar límite y mitigation timeout;
6. activar Workers Logs / Observability;
7. crear `DALIL — Operations`;
8. crear `DALIL — Security` si aporta valor;
9. configurar Email alerts;
10. evaluar Webhook;
11. activar Custom Alerts disponibles;
12. validar DDoS / SSL / billing notifications;
13. registrar screenshots/evidencia;
14. volver a ejecutar E2E después de configurar seguridad.

## No hacer

- no desactivar DDoS/WAF para resolver falsos positivos sin análisis;
- no allowlistear IPs personales como solución permanente;
- no poner el rate limit en `warn-only` de forma indefinida;
- no registrar tokens o Authorization headers;
- no comprar/activar productos pagos automáticamente;
- no asumir que el rate limiter distribuido es un contador global exacto;
- no modificar producción sin evidencia previa y rollback.
