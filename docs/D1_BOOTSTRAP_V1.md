# D1 Bootstrap V1

## Objetivo

Crear la primera base D1 real de Dalil, aplicar el schema versionado y verificarla **antes** de permitir que el scheduler escriba snapshots.

La secuencia es deliberadamente:

```text
crear DB
   ↓
aplicar migraciones
   ↓
verificación read-only
   ↓
primer snapshot manual
   ↓
verificación de filas
   ↓
GitHub Secrets
   ↓
workflow manual
   ↓
scheduler habilitado
```

No se salta ninguna etapa.

## Límite de ejecución / handoff de workstation

La preparación de código, documentación y CI puede realizarse desde cualquier entorno confiable porque no requiere credenciales.

La ejecución contra la cuenta real de Cloudflare queda deliberadamente diferida a la workstation personal autorizada. Hasta ese momento **no** se deben:

- autenticar usuarios de Cloudflare;
- crear la D1 real;
- copiar Account ID o Database ID;
- crear API Tokens;
- completar `.env.local`;
- configurar GitHub Secrets;
- habilitar `DALIL_SNAPSHOTS_ENABLED`;
- ejecutar persistencia remota real.

Este límite no bloquea el hardening del contrato, las pruebas deterministas ni la preparación del deployment.

## Estado previo requerido

En `main` deben estar integrados:

- D1 Schema V1;
- GitHub Snapshots V1;
- GitHub History V1.

Antes de trabajar:

```powershell
git switch main
git pull --ff-only
pnpm install --frozen-lockfile
pnpm schema:validate
pnpm snapshot:validate
pnpm history:validate
```

## 1. Autenticación Cloudflare

Usar Wrangler desde pnpm:

```powershell
pnpm dlx wrangler login
```

La autenticación ocurre con Cloudflare. No se guarda ningún token de cuenta en el repositorio.

Comprobar sesión:

```powershell
pnpm dlx wrangler whoami
```

## 2. Descubrir o crear la base

Nombre V1:

`dalil-prod`

Antes de crear recursos, comprobar si la base ya existe:

```powershell
pnpm dlx wrangler d1 list
```

Si `dalil-prod` no existe:

```powershell
pnpm dlx wrangler d1 create dalil-prod
```

Si ya existe, reutilizarla y no crear una segunda base.

Guardar localmente:

- Account ID;
- Database ID de `dalil-prod`.

No publicar credenciales, tokens ni identificadores completos en issues, PRs, screenshots o logs.

No se fija manualmente una región en esta etapa: Dalil es global y la elección de localización se tratará como una decisión de infraestructura separada si aparece una necesidad de residencia o latencia demostrable.

## 3. Preparar configuración temporal de Wrangler para migraciones

Validado con Wrangler `4.147.0`: los comandos `d1 migrations list/apply` requieren una configuración que declare la D1. Si el repositorio todavía no contiene una configuración de runtime Cloudflare, no crear una configuración versionada sólo para el bootstrap.

Obtener el Database ID sin copiarlo al repositorio:

```powershell
$dalil = pnpm dlx wrangler d1 list --json |
    ConvertFrom-Json |
    Where-Object { $_.name -eq "dalil-prod" }

if (-not $dalil) {
    throw "No se encontró dalil-prod."
}

$dbId = $dalil.uuid
if (-not $dbId) { $dbId = $dalil.id }
if (-not $dbId) { $dbId = $dalil.database_id }
if (-not $dbId) {
    throw "No se pudo obtener el Database ID."
}
```

Crear una configuración temporal fuera del repositorio:

```powershell
$cfg = Join-Path $env:TEMP "dalil-wrangler-d1.jsonc"
$migrationsDir = (Resolve-Path ".\migrations").Path.Replace("\\","/")

$config = @{
    d1_databases = @(
        @{
            binding        = "DB"
            database_name  = "dalil-prod"
            database_id    = $dbId
            migrations_dir = $migrationsDir
        }
    )
} | ConvertTo-Json -Depth 5

[System.IO.File]::WriteAllText(
    $cfg,
    $config,
    [System.Text.UTF8Encoding]::new($false)
)
```

La configuración temporal:

- no contiene el API token;
- no se crea dentro del repositorio;
- no debe versionarse;
- sólo existe para que Wrangler pueda resolver la D1 y el directorio de migraciones durante este bootstrap.

Comprobar que Git sigue limpio antes de continuar:

```powershell
git status
```

## 4. Aplicar migraciones

Las migraciones viven en `migrations/`.

Comprobar migraciones pendientes:

```powershell
pnpm dlx wrangler d1 migrations list dalil-prod --remote --config "$cfg"
```

Aplicar únicamente después de revisar la lista:

```powershell
pnpm dlx wrangler d1 migrations apply dalil-prod --remote --config "$cfg"
```

Wrangler mantiene la tabla `d1_migrations` para registrar las migraciones aplicadas.

Después de aplicar:

```powershell
pnpm dlx wrangler d1 migrations list dalil-prod --remote --config "$cfg"
```

El resultado esperado es `No migrations to apply!`.

La configuración temporal puede eliminarse cuando finalice el bootstrap:

```powershell
Remove-Item "$env:TEMP\dalil-wrangler-d1.jsonc" -ErrorAction SilentlyContinue
```

## 5. Token de API

Crear un Cloudflare API Token de mínimo privilegio para D1.

El collector de GitHub necesita escritura, por lo que el token destinado al workflow debe tener únicamente el acceso D1 necesario para esa base/cuenta.

No usar Global API Key.

## 6. Validación local read-only

Copiar:

`.env.example → .env.local`

Completar localmente:

```text
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_D1_API_TOKEN=
```

`.env.local` está ignorado por Git.

Ejecutar:

```powershell
pnpm d1:verify
```

Tanto el verificador como el collector persistente consumen el mismo contrato de configuración compartido. Si existe `.env.local`, ambos lo cargan; en CI utilizan únicamente variables de entorno/Secrets.

El contrato rechaza Account ID y Database ID que no tengan el formato esperado antes de realizar requests.

El verificador:

- no ejecuta INSERT/UPDATE/DELETE;
- comprueba las tablas esperadas;
- comprueba migraciones cuando `d1_migrations` existe;
- devuelve conteos de:
  - sources;
  - content_items;
  - repository_snapshots;
  - ingestion_runs;
- no imprime el token.

Antes del primer snapshot los conteos de dominio pueden ser cero.

## 7. Primer snapshot persistido

Sólo después de `d1:verify = PASS`:

```powershell
node scripts/github-snapshot.mjs --manual --persist
```

Debe terminar con:

`[github-snapshot] PERSISTED`

Volver a ejecutar:

```powershell
pnpm d1:verify
```

Criterio mínimo esperado después del primer snapshot completo de los 3 repositorios:

- sources >= 1;
- contentItems >= 3;
- repositorySnapshots >= 3;
- ingestionRuns >= 1.

No se exige igualdad exacta porque un rerun o futuras fuentes pueden aumentar los conteos.

## 8. GitHub Secrets

Configurar en el repositorio:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`

Con GitHub CLI se recomienda usar el modo interactivo para el token y evitar escribirlo en el historial de shell:

```powershell
gh secret set CLOUDFLARE_D1_API_TOKEN
```

Los IDs pueden configurarse del mismo modo.

## 9. Workflow manual

Antes de habilitar schedule:

1. ejecutar `GitHub repository snapshots` con `persist=false`;
2. comprobar PASS;
3. ejecutar nuevamente con `persist=true`;
4. comprobar PASS;
5. ejecutar `pnpm d1:verify` y confirmar una nueva ventana cuando corresponda.

## 10. Habilitar scheduler

Sólo después de las pruebas manuales:

`DALIL_SNAPSHOTS_ENABLED=true`

El schedule existente ejecuta cada 6 horas.

Si la variable no es `true`, las ejecuciones programadas no escriben.

## Free-tier guardrail

Dalil parte con 3 repositorios y 4 ventanas diarias:

```text
3 × 4 = 12 snapshots/día
```

El número de filas escritas real es mayor porque también se actualizan metadata e índices, pero el orden de magnitud inicial permanece deliberadamente pequeño.

La ampliación del catálogo o frecuencia requiere revisar primero métricas reales de D1.

## Rollback / recuperación

Las migraciones remotas se aplican a través de Wrangler.

Cloudflare captura un backup al aplicar migraciones y D1 Free dispone de Time Travel con retención limitada. Cualquier restauración debe tratarse como una acción explícita y verificada; no se automatiza desde Dalil en V1.

## Evidencia de bootstrap observada — 2026-10-04

La primera ejecución real del procedimiento confirmó:

- `dalil-prod` ya existía y fue reutilizada;
- Wrangler `4.147.0` requirió configuración D1 explícita para `migrations list/apply`;
- `0001_dalil_core.sql` se aplicó correctamente;
- `d1:verify = PASS` con 10 tablas de dominio esperadas;
- primer snapshot persistido: 3 repositorios observados, 0 fallos;
- conteos posteriores: `sources=1`, `contentItems=3`, `repositorySnapshots=3`, `ingestionRuns=1`;
- workflow remoto `persist=false` = PASS;
- workflow remoto `persist=true` = PASS;
- rerun en el mismo bucket mantuvo `repositorySnapshots=3` e `ingestionRuns=1`, confirmando idempotencia real;
- `DALIL_SNAPSHOTS_ENABLED=true` quedó habilitado únicamente después de completar los gates manuales.

Esta evidencia describe el bootstrap observado y no sustituye los gates para futuras recreaciones o migraciones.

## Gate de salida

D1 Bootstrap V1 sólo queda cerrado cuando existe evidencia de:

- schema remoto aplicado;
- `d1:verify = PASS`;
- snapshot manual persistido;
- conteos posteriores coherentes;
- secrets configurados;
- workflow manual `persist=false` PASS;
- workflow manual `persist=true` PASS;
- idempotencia del bucket verificada;
- scheduler habilitado sólo después de los gates manuales.
