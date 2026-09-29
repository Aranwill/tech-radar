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

## 2. Crear la base

Nombre V1:

`dalil-prod`

```powershell
pnpm dlx wrangler d1 create dalil-prod
```

Guardar de la salida:

- Account ID;
- Database ID.

No publicar credenciales ni tokens en issues, PRs, screenshots o logs.

No se fija manualmente una región en esta etapa: Dalil es global y la elección de localización se tratará como una decisión de infraestructura separada si aparece una necesidad de residencia o latencia demostrable.

## 3. Aplicar migraciones

Las migraciones viven en `migrations/`.

Comprobar migraciones:

```powershell
pnpm dlx wrangler d1 migrations list dalil-prod --remote
```

Aplicar:

```powershell
pnpm dlx wrangler d1 migrations apply dalil-prod --remote
```

Wrangler mantiene la tabla `d1_migrations` para registrar las migraciones aplicadas.

## 4. Token de API

Crear un Cloudflare API Token de mínimo privilegio para D1.

El collector de GitHub necesita escritura, por lo que el token destinado al workflow debe tener únicamente el acceso D1 necesario para esa base/cuenta.

No usar Global API Key.

## 5. Validación local read-only

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

## 6. Primer snapshot persistido

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

## 7. GitHub Secrets

Configurar en el repositorio:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`

Con GitHub CLI se recomienda usar el modo interactivo para el token y evitar escribirlo en el historial de shell:

```powershell
gh secret set CLOUDFLARE_D1_API_TOKEN
```

Los IDs pueden configurarse del mismo modo.

## 8. Workflow manual

Antes de habilitar schedule:

1. ejecutar `GitHub repository snapshots` con `persist=false`;
2. comprobar PASS;
3. ejecutar nuevamente con `persist=true`;
4. comprobar PASS;
5. ejecutar `pnpm d1:verify` y confirmar una nueva ventana cuando corresponda.

## 9. Habilitar scheduler

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

## Gate de salida

D1 Bootstrap V1 sólo queda cerrado cuando existe evidencia de:

- schema remoto aplicado;
- `d1:verify = PASS`;
- snapshot manual persistido;
- conteos posteriores coherentes;
- secrets configurados;
- workflow manual persistente PASS;
- scheduler aún controlado explícitamente.
