# Cloud Runtime & Observability V1

## Estado

Baseline arquitectónica propuesta para **Dalil**.

Esta decisión prioriza tres restricciones explícitas:

1. Dalil debe seguir funcionando aunque ningún dispositivo del usuario esté encendido.
2. La etapa inicial debe poder operar con presupuesto de infraestructura de **USD 0** dentro de los límites gratuitos.
3. La aplicación no debe sacrificar trazabilidad, seguridad ni posibilidad de migración futura por aprovechar un free tier.

La selección de proveedor es una baseline revisable, no una afirmación de lock-in permanente.

## Invariantes

- El frontend, la API, la persistencia y la ingesta esencial no dependen de una PC personal, navegador abierto, Ollama local ni proceso doméstico.
- El procesamiento local queda reservado para desarrollo, experimentos y benchmarks; no forma parte del camino crítico de producción.
- Los límites gratuitos deben fallar de forma visible y segura. No se diseña un mecanismo que habilite gasto automático para ocultar un exceso de cuota.
- Los contratos de dominio de Dalil permanecen separados de SDKs específicos del proveedor.
- La observabilidad pública usa datos agregados. No requiere almacenar IP, fingerprint ni identificadores persistentes de visitante.

## Baseline de despliegue

```text
                           INTERNET
                              |
              +---------------+---------------+
              |                               |
       fuentes externas                  usuarios
      RSS / APIs / GitHub          PC / móvil / tablet
              |                               |
              v                               v
       GitHub Actions                  Cloudflare Edge
   scheduler + processing          static assets + Worker
              |                               |
              |                         +-----+------+
              |                         |            |
              +-----------------------> D1      Analytics
              |                         |        Engine
              +-----------------------> R2           |
                                        |             |
                                        +------+------+ 
                                               |
                                           API Dalil
                                               |
                                               v
                                      contrato UI seguro
                                               |
                                               v
                                             PWA
```

### Cloudflare Static Assets

Responsable de entregar la aplicación web y sus assets públicos desde la red edge.

Los assets estáticos no deben depender de una máquina de origen mantenida por el proyecto.

### Cloudflare Workers

Responsable del runtime HTTP pequeño y controlado:

- API propia;
- lectura de D1;
- acceso autorizado a R2;
- validación de entradas y salidas;
- rate limiting cuando corresponda;
- registro de telemetría agregada;
- respuestas degradadas de forma segura si un servicio alcanza cuota o no está disponible.

No se usa Workers Free para ejecutar pipelines pesados de crawling, enriquecimiento o razonamiento.

### Cloudflare D1

Persistencia relacional inicial.

Responsabilidades previstas:

- fuentes;
- items normalizados;
- stories;
- snapshots;
- claims;
- evidence metadata;
- relaciones claim/evidence;
- estados de verificación;
- rollups históricos de observabilidad cuando se decida conservarlos más allá de la retención operativa.

D1 reemplaza a PostgreSQL como persistencia inicial de V1. El dominio no debe acoplarse a SQL específico de D1 de forma que impida una migración futura a PostgreSQL si la escala lo justifica.

### Cloudflare R2

Object storage para artefactos que no correspondan a filas relacionales:

- JSON de procesamiento;
- artefactos derivados;
- snapshots permitidos;
- assets propios;
- evidencia estructurada que requiera conservar representación de archivo.

No se debe usar R2 como espejo indiscriminado de contenido de terceros.

### GitHub Actions

Motor programado inicial para tareas que exceden el presupuesto de CPU de un Worker Free:

- recolección;
- normalización;
- deduplicación;
- snapshots;
- validaciones;
- generación de artefactos;
- futuros pasos de evidencia;
- llamadas controladas a modelos cuando exista una justificación y presupuesto explícitos.

Los workflows deben ser idempotentes cuando sea razonable y persistir estados suficientes para reanudar sin duplicar datos.

## Circuito de datos

```text
collector
   |
   v
raw observation
   |
   v
normalizer
   |
   v
NormalizedItem
   |
   +------> provenance
   |
   v
deduplicator
   |
   v
Story / Repository / ResearchItem
   |
   v
evidence pipeline
   |
   +------> Claim
   +------> Evidence
   +------> Contradiction
   |
   v
persistence
  D1 + R2
   |
   v
Dalil API
   |
   v
structured UI contract
   |
   v
React catalog
```

No se permite que una fuente externa salte directamente del collector al renderer.

## Presupuesto gratuito — snapshot 2026-09-29

Los límites son una restricción operativa, no parte permanente del dominio. Deben revalidarse antes del despliegue y mantenerse documentados.

### Workers Free

- 100.000 requests por día.
- 10 ms de CPU por invocación.
- 128 MB de memoria.

Referencia: https://developers.cloudflare.com/workers/platform/limits/

### D1 Free

- 5 millones de filas leídas por día.
- 100.000 filas escritas por día.
- 5 GB de almacenamiento total por cuenta.
- máximo de 500 MB por base en Free.

Desde el 1 de septiembre de 2026, al alcanzar las cuotas diarias Free las consultas fallan hasta el siguiente reset; no se debe ocultar este estado.

Referencias:
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/

### R2 Free

Para Standard storage:

- 10 GB-month de storage;
- 1 millón de operaciones Class A por mes;
- 10 millones de operaciones Class B por mes;
- egress a Internet sin cargo.

Referencia: https://developers.cloudflare.com/r2/pricing/

### Workers Analytics Engine Free

- 100.000 data points escritos por día;
- 10.000 read queries por día;
- retención operativa actual: 3 meses.

La documentación de Cloudflare indica que la facturación de Analytics Engine todavía no se aplica y publica los límites/precios previstos. Dalil no debe asumir que esta condición será permanente; el uso debe permanecer debajo del free allocation y revisarse periódicamente.

Referencias:
- https://developers.cloudflare.com/analytics/analytics-engine/pricing/
- https://developers.cloudflare.com/analytics/analytics-engine/limits/

### GitHub Actions

El repositorio es público. Los standard GitHub-hosted runners son gratuitos para repositorios públicos.

Dalil no debe usar larger runners como parte del baseline gratuito.

Referencia:
https://docs.github.com/en/billing/concepts/product-billing/github-actions

## Observabilidad geográfica

### Objetivo

Dalil podrá mostrar un mapa mundial de actividad para hacer visible el alcance real del servicio y su comportamiento operativo.

El mapa no es decoración: debe derivar de métricas reales.

### Semántica

En V1 se utilizará el término **actividad** o **solicitudes**, no **conexiones**, porque una request HTTP no representa necesariamente una conexión concurrente persistente.

Si en el futuro existe WebSocket, SSE u otro canal persistente, las conexiones activas deberán medirse con un contrato diferente.

### Señales disponibles

Cloudflare Workers expone metadata de la request que permite obtener, entre otros:

- country: código ISO de dos letras del país de origen de la request;
- colo: datacenter de Cloudflare que atendió la petición;
- clientTcpRtt / clientAcceptEncoding y otras señales de transporte cuando estén disponibles.

Dalil sólo necesita country para el mapa público inicial.

No se almacenará la dirección IP.

### Evento operativo mínimo

Una request completada puede producir un único data point agregado conceptualmente como:

```text
timestamp
country_iso2
event_kind
route_class
status_class
latency_ms
```

Valores posibles iniciales:

```text
event_kind:
  pageview
  api

route_class:
  feed
  repositories
  evidence
  metrics
  other

status_class:
  2xx
  3xx
  4xx
  5xx
```

No se persistirán:

- IP;
- URL con query string;
- payload;
- token;
- cookie;
- user id;
- fingerprint;
- User-Agent completo.

### Métricas públicas

El endpoint agregado podrá exponer, por país y ventana:

- solicitudes;
- pageviews instrumentadas;
- respuestas 2xx;
- respuestas 4xx;
- respuestas 5xx;
- error rate;
- latencia media;
- latencia p95 si la fuente y el volumen permiten calcularla correctamente;
- última actividad observada;
- porcentaje del tráfico total.

Ventanas candidatas:

- últimos 15 minutos;
- 1 hora;
- 24 horas;
- 7 días.

No se mostrará una métrica si su semántica no puede demostrarse.

### Visualización

Componente futuro: `WorldActivityMap`.

```text
+------------------------------------------------------+
| Actividad global                         últimos 24h  |
|                                                      |
|        [ mapa mundial por intensidad ]               |
|                                                      |
|  38 países   12.4k requests   99.4% 2xx   84 ms     |
|                                                      |
|  Argentina       2.8k   99.7%                        |
|  España          1.9k   99.2%                        |
|  México          1.4k   98.9%                        |
+------------------------------------------------------+
```

La primera versión debe usar un asset cartográfico local y no depender de un proveedor externo de mapas para renderizar el mundo.

El mapa debe respetar dark/light mode, navegación por teclado y una representación textual/tabular equivalente para accesibilidad.

### Near-real-time, no tiempo real falso

La UI puede actualizar el agregado cada intervalo corto, pero se etiquetará como **actividad reciente** o **near-real-time** mientras no exista un canal persistente con garantías explícitas.

No se simularán puntos, pulsos ni requests.

## Persistencia de observabilidad

Analytics Engine sirve para telemetría operativa de corta/mediana duración.

Si Dalil necesita tendencias mayores a su retención:

```text
Analytics Engine
      |
      | rollup programado
      v
D1 country_metrics_daily
      |
      v
histórico 30d / 90d / anual
```

Sólo se persisten agregados; no se copia el stream de eventos crudos a D1.

Esquema conceptual:

```text
country_metrics_daily
- day
- country_iso2
- requests
- pageviews
- responses_2xx
- responses_4xx
- responses_5xx
- avg_latency_ms
```

## Privacidad

La geolocalización se deriva en el edge a nivel país.

Principios:

- no guardar IP;
- no intentar identificar personas;
- no fingerprinting;
- no precisión inferior a país en V1;
- no exponer eventos individuales públicamente;
- aplicar umbral mínimo de agregación si un país tiene actividad demasiado baja y pudiera convertirse en dato identificable por contexto.

La política de privacidad debe describir esta telemetría antes del despliegue público.

## Seguridad de métricas

- El dashboard público nunca recibe credenciales de Cloudflare.
- Las consultas a Analytics Engine o APIs administrativas ocurren server-side.
- El endpoint público sólo devuelve agregados allowlisted.
- Se limita cardinalidad de dimensiones.
- Las rutas se clasifican mediante enum interno; nunca se usa el pathname arbitrario como dimensión.
- Los errores del proveedor no exponen mensajes internos.
- La telemetría no participa por sí sola en decisiones de ranking editorial.

## Cost guardrails

Dalil debe poder operar sin sorpresa de facturación.

Controles previstos:

1. presupuestos/alertas del proveedor cuando estén disponibles;
2. límites explícitos por job;
3. frecuencia de ingestión diferenciada por fuente;
4. caché;
5. consultas D1 indexadas;
6. rollups en lugar de eventos históricos completos;
7. degradación segura al alcanzar cuotas;
8. revisión periódica de free tiers antes de ampliar una feature;
9. no habilitar servicios pagos automáticamente.

## Orden de implementación

### Fase A — Deploy foundation

- adaptar build/runtime para Cloudflare;
- desplegar static assets;
- Worker mínimo;
- validar headers de seguridad en producción;
- comprobar mobile/PWA desde un segundo dispositivo.

### Fase B — Persistencia

- schema D1;
- migraciones reproducibles;
- repositorios/snapshots;
- adapter de persistence;
- backup/export verificable.

### Fase C — Pipeline remoto

- workflow de GitHub Actions;
- scheduler;
- collector GitHub existente ejecutado fuera del request path;
- idempotencia;
- métricas de ejecución.

### Fase D — Observabilidad

- Analytics Engine binding;
- contrato de eventos mínimo;
- endpoint agregado;
- `WorldActivityMap`;
- fallback accesible;
- pruebas de privacidad y cardinalidad.

### Fase E — R2 / evidence artifacts

- definir qué evidencia amerita object storage;
- lifecycle/retention;
- hashes;
- enlaces desde metadata D1.

## Criterios de aceptación de la baseline

La baseline sólo queda confirmada cuando exista evidencia de que:

- Dalil puede cargarse con la PC del propietario apagada;
- la UI funciona desde desktop y móvil;
- un workflow remoto actualiza un dato persistente;
- D1 conserva ese dato entre despliegues;
- el frontend consume sólo la API/contrato permitido;
- ninguna credencial llega al cliente;
- el mapa utiliza métricas reales agregadas;
- la telemetría no almacena IP;
- el sistema puede alcanzar un límite gratuito sin generar gasto automático;
- CI, typecheck, build y security baseline permanecen PASS.
