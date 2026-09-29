# GitHub History V1

## Objetivo

Derivar variaciones temporales verificables a partir de `repository_snapshots` sin estimar datos faltantes.

Esta etapa define el contrato de:

- 24h;
- 7d;
- 30d.

Todavía **no define momentum ni ranking**.

## Regla de baseline

Los snapshots se normalizan a buckets UTC de 6h. Por eso una ventana sólo queda `ready` si existe el snapshot del bucket temporal exacto.

Ejemplo, si el snapshot más reciente es:

`2026-09-30T00:00:00Z`

los baselines requeridos son:

- 24h → `2026-09-29T00:00:00Z`
- 7d → `2026-09-23T00:00:00Z`
- 30d → `2026-08-31T00:00:00Z`

No se sustituye un baseline faltante por uno de 18h, 30h, 6d o 31d.

## Estados

### ready

Existe el bucket exacto. Se calculan deltas firmados:

```text
delta = latest - baseline
```

Aplica a:

- stars;
- forks;
- issues/PR abiertas;
- contributors, sólo si ambos extremos tienen dato.

Un delta negativo es válido: una métrica pública puede disminuir.

### pending / insufficient_history

El histórico todavía no llega hasta la ventana pedida.

Ejemplo:

- Dalil lleva 2 días recolectando;
- 24h puede estar ready;
- 7d y 30d siguen pending.

### pending / baseline_gap

El histórico sí cubre la antigüedad pedida pero falta el bucket exacto.

Esto puede indicar:

- ejecución perdida;
- ingestión parcial;
- hueco operativo.

Dalil no lo oculta ni extrapola.

## Por qué no usamos el snapshot "más cercano"

Una ventana etiquetada como 24h no debe representar silenciosamente 18h o 30h.

La exactitud por bucket mantiene:

- trazabilidad;
- comparabilidad;
- determinismo;
- explicabilidad del futuro ranking.

Si más adelante se desea una ventana aproximada deberá mostrarse explícitamente como aproximada y tendrá otro contrato.

## Contrato

Implementación:

`scripts/lib/github-history-core.mjs`

Validación:

`scripts/validate-github-history.mjs`

Comando:

```bash
pnpm history:validate
```

La validación cubre:

- baselines exactos;
- 24h / 7d / 30d;
- histórico insuficiente;
- huecos de baseline;
- deltas negativos;
- contributors nullable;
- rechazo de snapshots duplicados.

## Lectura futura desde D1

Para cada repositorio no hace falta cargar toda la historia para estas tres ventanas.

Una implementación D1 puede:

1. leer el último `observed_at`;
2. calcular los tres timestamps objetivo;
3. consultar `latest + 24h + 7d + 30d`;
4. pasar esas filas al contrato determinista.

La primary key existente:

`(item_id, observed_at)`

permite buscar exactamente por repositorio y timestamp sin crear una tabla derivada nueva.

## UI futura

La card sólo debe mostrar una ventana cuando su estado sea `ready`.

Ejemplo válido:

```text
★ +124 / 7d
```

Ejemplo cuando falta baseline:

```text
Histórico 7d pendiente
```

No se mostrará `0`, un porcentaje estimado ni una sparkline artificial.

## Siguiente etapa

Después de conectar D1 real:

```text
snapshots persistidos
        ↓
History V1
        ↓
deltas verificables
        ↓
normalización por ventana
        ↓
Momentum V1 explicable
        ↓
Emerging / Popular / New & Interesting
```
