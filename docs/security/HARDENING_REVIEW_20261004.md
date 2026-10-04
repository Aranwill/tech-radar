# DALIL Security Hardening Review — 2026-10-04

## Alcance

Revisión preventiva antes de ampliar DALIL.

Se relevaron:

- rutas y componentes de aplicación;
- datasource GitHub y límites de red;
- snapshots e integridad histórica;
- SQL y D1;
- secretos y GitHub Actions;
- dependencias y lockfile;
- CSP, security headers, service worker y SVG;
- configuración Cloudflare/vinext;
- validadores de seguridad existentes.

Este informe no declara ausencia absoluta de vulnerabilidades. Registra evidencia observada, cierres implementados y riesgos residuales que deben permanecer visibles.

## Hallazgos cerrados en este hardening

### DALIL-SEC-01 — Secrets D1 con scope excesivo

**Estado:** CLOSED.

Los Secrets de producción ya no se inyectan a nivel job. Sólo los pasos que persisten reciben las credenciales D1.

Una ejecución manual con persistencia queda bloqueada fuera de `refs/heads/main`.

### DALIL-SEC-02 — Backfill live podía fabricar historia

**Estado:** CLOSED.

El collector ya no permite etiquetar métricas GitHub actuales como observaciones históricas.

`--backfill` queda rechazado hasta que exista una fuente histórica real. `--at` sólo se permite para dry-run manual, nunca junto con persistencia y siempre en un bucket UTC exacto de 6h.

### DALIL-SEC-03 — Catálogo GitHub admitía dot-segments

**Estado:** CLOSED.

Los identificadores se validan como exactamente `owner/repo`, se rechazan `.` y `..` y cada segmento se codifica antes de formar la ruta API.

### DALIL-SEC-04 — Token GitHub podía ampliar accidentalmente el trust boundary

**Estado:** CLOSED.

Tanto el runtime como el collector requieren repositorios públicos, nombre esperado y URL canónica `https://github.com/<owner>/<repo>`. Un token con acceso privado no autoriza que DALIL publique metadata privada.

### DALIL-SEC-05 — Baseline de seguridad cubría sólo parte del árbol

**Estado:** CLOSED.

El baseline ahora revisa código de aplicación, scripts, service worker, configuración Next/vinext/Cloudflare, SVG, workflows, archivos sensibles, versiones directas y políticas pnpm.

### DALIL-SEC-06 — Políticas del navegador más amplias que las features existentes

**Estado:** CLOSED para el alcance actual.

Se aplica deny-by-default a geolocalización, forms, media, worker origins y conexiones de producción. El Referrer-Policy pasa a `no-referrer`.

### DALIL-SEC-07 — Evidencia Cloudflare no compilaba ni probaba el runtime real

**Estado:** CLOSED.

El workflow usa el vinext instalado desde lockfile, ejecuta `build:vinext` y prueba headers sobre un preview real.

## Bloqueadores y riesgos residuales

### DALIL-SC-01 — braces / CVE-2026-93687

**Estado:** BLOCKING.

`braces@3.0.3` llega transitivamente desde el toolchain vinext. El audit lo clasifica HIGH y no existe todavía una versión publicada parcheada.

No se añade ignore, no se reduce el audit y no se debe promover #35 mientras el gate siga rojo.

La reachability observada corresponde al toolchain de glob/build, no a una ruta HTTP de DALIL. Esto reduce exposición de runtime pero no elimina el riesgo de supply chain/build.

### DALIL-SC-02 — fflate / GHSA-px8p-9vwx-vf98

**Estado:** MITIGATION CANDIDATE.

CI identificó `fflate@0.7.3`: `unzipSync` puede entrar en loop infinito ante ZIP64 malformado. La advisory afecta `>=0.7.0 <0.7.5` y publica `0.7.5` como versión corregida.

DALIL fuerza temporalmente `fflate: 0.7.5` mediante un override exacto de pnpm. El cierre requiere evidencia de:

- `pnpm install --frozen-lockfile` PASS;
- typecheck/build Next PASS;
- build/runtime vinext PASS;
- audit sin GHSA-px8p-9vwx-vf98.

No se usa una excepción de audit.

### DALIL-DATA-01 — ingestion_runs no es append-only por ejecución

**Estado:** OPEN / DESIGN REQUIRED.

El run ID actual deriva del bucket y un rerun del mismo bucket actualiza el mismo registro.

Los snapshots sí deben seguir siendo idempotentes por `(item_id, observed_at)`, pero la auditoría operacional debería conservar cada intento de ingesta. Requiere una decisión de schema/contrato separada antes de afirmar que `ingestion_runs` registra cada ejecución.

### DALIL-EDGE-01 — endpoint live puede amplificar requests upstream

**Estado:** OPEN / PRE-DEPLOY BLOCKER.

`/api/github/repositories` consulta GitHub desde el runtime. Sin cache persistente/rate-limit distribuido, múltiples isolates pueden amplificar tráfico.

El camino previsto es que la UI pública lea D1/snapshots propios y que la ingesta sea el único actor que consulta GitHub con cadencia controlada.

### DALIL-CSP-01 — unsafe-inline residual

**Estado:** OPEN / PRE-STABLE-DEPLOY.

Next/vinext todavía requieren validar compatibilidad antes de reemplazar `script-src/style-src 'unsafe-inline'` por nonce/hash.

No se elimina a ciegas porque romper render/hydration no es un control de seguridad válido. Debe resolverse mediante una prueba reproducible.

### DALIL-SECOPS-01 — scanners/settings de plataforma

**Estado:** OPEN.

Verificar por separado:

- CodeQL/code scanning;
- secret scanning;
- push protection;
- private vulnerability reporting.

No se declaran habilitados sin evidencia de configuración.

## Superficies sin finding bloqueante en esta revisión

- no se observó `dangerouslySetInnerHTML`, `eval`, `new Function` ni `document.write` en la aplicación;
- las queries D1 construidas por DALIL usan parámetros para valores externos;
- respuestas externas relevantes tienen timeout y límite de tamaño;
- los errores públicos de GitHub son genéricos;
- no se observaron scripts, `foreignObject`, handlers de eventos ni URLs JavaScript en los SVG versionados;
- Actions de terceros están fijadas a SHA y checkout no persiste credenciales.

Estos puntos son evidencia del estado revisado, no una garantía futura. El baseline automatizado debe impedir regresiones simples.
