# D1 Schema V1

## Estado

Schema inicial versionado para la persistencia de **Dalil**.

Esta etapa define y valida SQL compatible con la semántica SQLite usada por Cloudflare D1. **No crea una base remota, no agrega bindings y no requiere credenciales.**

Referencias:

- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.cloudflare.com/d1/sql-api/
- https://developers.cloudflare.com/d1/sql-api/foreign-keys/
- https://developers.cloudflare.com/d1/best-practices/use-indexes/

## Objetivo

Dar persistencia a los primeros circuitos reales sin convertir la base V1 en un modelo excesivamente amplio.

El schema cubre:

1. procedencia de fuentes;
2. ejecuciones de ingesta;
3. items normalizados;
4. snapshots históricos de repositorios;
5. agrupación en stories;
6. claims y evidencia;
7. rollups geográficos diarios de observabilidad.

No contiene usuarios ni datos de identidad personal.

## Mapa

```text
sources
  |
  +---- ingestion_runs
  |
  +---- content_items
          |
          +---- repository_snapshots
          |
          +---- story_items ---- stories
          |
          +---- claims ---- claim_evidence ---- evidence_records
                                                |
sources ----------------------------------------+

country_metrics_daily   (agregado independiente, sin identificadores personales)
```

## Tablas

### `sources`

Catálogo de orígenes permitidos.

No guarda un “trust score”. La procedencia es un hecho; la calidad de evidencia se evalúa con reglas separadas.

Campos relevantes:

- `id`;
- `kind`;
- `name`;
- `base_url`;
- `enabled`.

### `ingestion_runs`

Auditoría operacional de cada ejecución de ingesta.

Guarda contadores y un `error_code` acotado, no dumps de errores ni secretos.

Permite distinguir:

- scheduled;
- manual;
- backfill.

### `content_items`

Representación normalizada de observaciones externas.

Un item conserva:

- fuente;
- identificador externo;
- tipo;
- URL canónica;
- título/resumen normalizados;
- timestamps de publicación/observación;
- hash de contenido;
- estado.

La restricción única `(source_id, external_id)` evita duplicar el mismo objeto de una fuente.

### `repository_snapshots`

Histórico propio para métricas GitHub.

Permite calcular crecimiento real en ventanas 7d/30d sin inventar momentum.

Incluye:

- stars;
- forks;
- issues/PR abiertas según la semántica actual del datasource;
- cantidad de contribuidores cuando esté disponible;
- lenguaje;
- timestamp observado.

### `stories` + `story_items`

Agrupación de múltiples items que hablan del mismo tema.

`match_kind` hace visible cómo se vinculó el item:

- exact;
- canonical;
- heuristic;
- semantic;
- manual.

`confidence_basis_points` sólo representa confianza de **matching/deduplicación**. No es porcentaje de verdad, veracidad de una noticia ni confianza epistemológica.

### `claims`

Claims extraídos de un item.

Cada claim conserva:

- statement;
- hash;
- método de extracción;
- momento de extracción.

Métodos iniciales:

- deterministic;
- model;
- manual.

La presencia de un claim no implica que esté validado.

### `evidence_records`

Metadata de una pieza de evidencia observada.

Conserva URL, procedencia, tipo, hash y, opcionalmente, una referencia `object_key` a R2.

No almacena por defecto el cuerpo completo de un artículo de terceros.

### `claim_evidence`

Relación explícita entre un claim y una evidencia:

- supports;
- contradicts;
- context.

La relación tampoco representa una verdad automática. Los estados explicables de verificación se construirán encima de este grafo y deberán conservar su evidencia.

### `country_metrics_daily`

Rollup agregado para histórico de observabilidad.

Guarda únicamente:

- día;
- país ISO-2;
- requests/pageviews;
- respuestas por clase;
- suma y cantidad de muestras de latencia.

No almacena:

- IP;
- user id;
- cookies;
- fingerprint;
- payload;
- User-Agent.

La latencia media se deriva como:

```text
latency_sum_ms / latency_samples
```

No se persiste p95 agregado en V1 porque percentiles de ventanas diferentes no se pueden combinar correctamente promediándolos.

## Decisiones de integridad

### STRICT tables

Las tablas usan `STRICT` para reducir coerciones inesperadas.

### Foreign keys

D1 aplica foreign keys por defecto. Las relaciones tienen acciones explícitas `RESTRICT`, `CASCADE` o `SET NULL` según la semántica de cada vínculo.

### IDs

Los IDs son `TEXT` generados por la aplicación. El schema no impone todavía UUID versus ULID.

### Timestamps

Contrato V1: timestamps UTC ISO-8601 normalizados por la aplicación.

La base los conserva como `TEXT` para mantener portabilidad SQLite/D1.

### Hashes

Los hashes son metadata de integridad/deduplicación. El algoritmo se definirá en el contrato de ingesta antes de persistir datos reales.

## Índices

Los índices iniciales sólo cubren consultas previsibles:

- runs por source + fecha;
- items por kind/source + última observación;
- snapshots por fecha;
- stories activas por última actividad;
- búsqueda inversa story → item;
- claims por item;
- evidencia por source + fecha;
- relación inversa evidence → claims;
- histórico país + fecha.

No se agregan índices especulativos.

## Validación local/CI

El repositorio incluye:

```bash
pnpm schema:validate
```

El validador:

1. carga las migraciones SQL en orden;
2. aplica el schema en SQLite in-memory;
3. habilita foreign keys;
4. ejecuta `PRAGMA foreign_key_check`;
5. ejecuta `PRAGMA integrity_check`;
6. falla el CI ante cualquier inconsistencia.

Esto no reemplaza una prueba real contra D1 antes del primer deploy, pero evita versionar migraciones sintácticamente inválidas o internamente inconsistentes.

## Fuera de alcance

- crear la instancia D1;
- elegir database ID;
- bindings;
- seeds de producción;
- ORM;
- queries de runtime;
- API de escritura;
- retención definitiva;
- ranking;
- score de veracidad;
- autenticación de usuarios.

## Gate siguiente

Después de integrar runtime Cloudflare + D1 binding se debe:

1. aplicar las migraciones a una D1 local/preview;
2. ejecutar fixtures mínimos;
3. verificar índices con `EXPLAIN QUERY PLAN`;
4. probar rollback/recreación desde cero;
5. comprobar export de backup antes de usar datos reales.
