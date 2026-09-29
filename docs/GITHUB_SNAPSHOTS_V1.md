# GitHub Snapshots V1

## Objetivo

Persistir observaciones periódicas de los repositorios curados para que Dalil pueda construir histórico propio y, sólo después de acumular evidencia suficiente, derivar variaciones 24h/7d/30d y señales de momentum.

Esta etapa **no define todavía un score de momentum**.

## Fuente única del catálogo

El catálogo curado vive en:

`config/github-repositories.json`

La UI server-side y el colector remoto consumen el mismo archivo para evitar drift entre lo que Dalil muestra y lo que observa históricamente.

## Cadencia

Cadencia candidata V1: **cada 6 horas**.

Cada ejecución se normaliza a un bucket UTC de 6h:

```text
00:00
06:00
12:00
18:00
```

El par `(item_id, observed_at)` ya es clave primaria en `repository_snapshots`. Un rerun dentro del mismo bucket actualiza el snapshot existente en lugar de duplicarlo.

Esto da semántica **idempotente por bucket**, útil frente a retries de GitHub Actions.

## Datos observados

Por repositorio:

- stars;
- forks;
- issues/PR abiertas según `open_issues_count` de GitHub;
- contributor count cuando GitHub puede resolverlo;
- lenguaje;
- `source_updated_at`.

También se actualiza el `content_item` normalizado y se registra un `ingestion_run`.

No se descargan commits, issues, PRs ni contribuidores completos para crear el snapshot.

## Ejecución local

Dry-run, sin escribir en D1:

```bash
pnpm snapshot:github
```

Validación determinista del contrato SQL e idempotencia:

```bash
pnpm snapshot:validate
```

El validador usa SQLite en memoria, aplica las migraciones versionadas y comprueba:

- foreign keys;
- rerun del mismo bucket sin duplicados;
- creación de un snapshot en un bucket nuevo;
- tracking de runs parciales.

## Persistencia remota D1

El colector sólo intenta persistir si se ejecuta con `--persist`.

Variables server-side requeridas:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_D1_DATABASE_ID
CLOUDFLARE_D1_API_TOKEN
```

El token debe usar mínimo privilegio y limitarse a D1 Write para el recurso necesario.

El colector usa el endpoint administrativo oficial:

```text
POST /accounts/{account_id}/d1/database/{database_id}/query
```

con queries parametrizadas.

Referencia:
https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/

La REST API administrativa de D1 **no se expone a usuarios ni al navegador**. Es únicamente el canal inicial del job remoto. Si la ingesta externa crece o requiere una API general, se migrará a un Worker/proxy dedicado con contrato propio.

## Workflow remoto

`.github/workflows/github-snapshots.yml`

Soporta:

- `workflow_dispatch` para dry-run o persistencia manual;
- schedule cada 6h;
- ejecución programada deshabilitada por defecto mediante la variable:
  `DALIL_SNAPSHOTS_ENABLED`.

Para habilitar persistencia programada:

1. crear/aplicar la base D1 y migraciones;
2. configurar los tres secrets de Cloudflare;
3. ejecutar primero un workflow manual con `persist=true`;
4. verificar filas en `sources`, `content_items`, `repository_snapshots` e `ingestion_runs`;
5. recién entonces establecer `DALIL_SNAPSHOTS_ENABLED=true`.

No se habilita gasto automático.

## Volumen inicial

Con 3 repositorios y 4 ventanas por día:

```text
3 repos × 4 snapshots/día = 12 snapshots/día
```

Es deliberadamente pequeño. La expansión del catálogo deberá revisar cuotas, utilidad y frecuencia antes de aumentar escrituras.

## Seguridad

- catálogo allowlisted;
- no acepta owner/repo desde input del usuario;
- token GitHub sólo server-side;
- token Cloudflare sólo en GitHub Secrets;
- timeouts;
- redirects externos bloqueados;
- respuesta JSON acotada por tamaño;
- queries D1 parametrizadas;
- sin impresión de credenciales;
- Actions fijadas a SHA inmutable;
- persistencia deshabilitada hasta configuración explícita.

## Siguiente etapa

Cuando exista histórico suficiente:

```text
repository_snapshots
       |
       +--> baseline 24h
       +--> baseline 7d
       +--> baseline 30d
       |
       v
deltas verificables
       |
       v
momentum explicable
       |
       +--> Emerging
       +--> Popular
       +--> New & Interesting
```

Una señal no se mostrará si no existe un baseline temporal apropiado.
