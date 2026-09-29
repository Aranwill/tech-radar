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


## Semántica de issues

El campo `open_issues_count` de GitHub se expone en la UI como **issues/PR abiertas** para evitar presentarlo como un conteo exclusivo de Issues. En la API REST de GitHub, los pull requests comparten la semántica base de Issues y deben distinguirse explícitamente cuando se necesita un conteo separado.


## Contribuidores

Cada repositorio consulta además `/repos/{owner}/{repo}/contributors?per_page=1&anon=false`.

Con `per_page=1`, el número de la última página informado por GitHub permite obtener el conteo de contribuidores públicos sin descargar la lista completa.

- La UI muestra el valor exacto hasta 999 y `999+` a partir de ese punto para mantener la card compacta.
- El valor completo permanece disponible como contexto accesible en la interfaz.
- Si GitHub no puede resolver el endpoint de contribuidores, la API devuelve `contributorCount: null`, la card muestra `—` y el payload se marca como parcial.
- No se cargan avatares ni imágenes externas.
- La misma caché de 15 minutos limita llamadas adicionales.

El conteo se usa como señal descriptiva de comunidad; todavía no participa de ningún score de momentum.
