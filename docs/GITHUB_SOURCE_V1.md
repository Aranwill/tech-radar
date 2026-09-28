# GitHub Source V1

## Objetivo

Incorporar el primer datasource real sin agregar todavía base de datos, búsqueda arbitraria ni ranking de momentum.

## Flujo

```text
catálogo curado
     |
     v
GitHub REST API
     |
     v
schema Zod de respuesta externa
     |
     v
normalización RepositoryBlock
     |
     v
/api/github/repositories
     |
     v
LiveGithubRepositories
     |
     v
RepositoryCard
```

## Seguridad

- No se acepta un `owner/repo` proporcionado por el usuario.
- Los repositorios consultados viven en una allowlist local.
- No existe una URL externa controlada por el cliente.
- La respuesta de GitHub se valida antes de cruzar la frontera del datasource.
- Sólo se devuelven campos normalizados necesarios para la UI.
- `GITHUB_TOKEN` es opcional y exclusivamente server-side.
- Las llamadas externas tienen timeout.
- El endpoint interno aplica caché para evitar llamadas innecesarias.

## Rate limit

Sin autenticación, GitHub asocia las consultas públicas a la IP del servidor y aplica un límite inferior. Un token server-side puede ampliar el margen cuando despleguemos, pero no es necesario para desarrollar la primera versión.

El datasource usa caché de 15 minutos. No utilizamos todavía endpoints de búsqueda, que tienen límites separados y más restrictivos.

## Momentum

Esta versión no muestra crecimiento 7d/30d para datos reales porque aún no existe histórico propio. Inventar crecimiento a partir del valor actual violaría la trazabilidad del proyecto.

La siguiente etapa será persistir snapshots y derivar momentum de nuestras propias observaciones.
