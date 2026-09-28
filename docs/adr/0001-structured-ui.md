# ADR-0001: UI estructurada mediante catálogo permitido

**Estado:** aceptada para Foundation.

## Contexto

El proyecto quiere aprender y experimentar con patrones A2UI/MCP UI sin permitir que contenido externo o un modelo produzcan código ejecutable dentro de la aplicación.

## Decisión

La interfaz dinámica recibe estructuras de datos validadas y las traduce mediante un catálogo local y explícito:

```text
story      -> StoryCard
repository -> RepositoryCard
stat       -> StatCard
```

Los tipos desconocidos no se renderizan. No se aceptan HTML arbitrario, JavaScript arbitrario, `eval()`, componentes remotos ni URLs no HTTPS en acciones del contrato actual.

## Consecuencias

Ventajas:

- superficie de ataque menor;
- consistencia visual;
- accesibilidad controlada por la aplicación;
- temas claro/oscuro centralizados;
- testeo determinista;
- posibilidad de mapear el dominio a A2UI más adelante.

Costo:

- cada nuevo tipo visual debe incorporarse explícitamente al catálogo.
