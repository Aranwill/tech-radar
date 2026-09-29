# Dalil Brand Assets V1

## Estado

**Candidato oficial — pendiente de validación visual final.**

No se considera una identidad congelada hasta completar las pruebas de tamaño reducido y uso real como PWA/favicon.

## Marca

Nombre:

`DALIL`

Tagline:

`Inteligencia tecnológica.`

## Isotipo

Asset canónico candidato:

`public/brand/dalil-mark.svg`

Concepto:

`D + radar`

El isotipo evita texto embebido para seguir siendo reutilizable en:

- favicon;
- manifest/PWA;
- splash;
- README;
- social preview;
- header compacto;
- futuros assets monocromáticos.

## Principios

1. Debe reconocerse como `D` antes que como ilustración decorativa.
2. El radar debe seguir visible a 32–64 px.
3. No se deben añadir detalles internos que sólo funcionen en alta resolución.
4. El azul eléctrico/cyan es parte de la dirección visual, pero el símbolo debe admitir versión monocromática.
5. El fondo oscuro forma parte del asset de PWA actual; una variante transparente puede evaluarse por separado.
6. El logo no debe sustituir información funcional ni reducir accesibilidad.

## Integración candidata

En esta rama:

- `public/icon.svg` usa el nuevo isotipo;
- `src/app/icon.svg` usa el mismo vector;
- manifest y metadata siguen apuntando a `/icon.svg`.

No se cambia todavía el wordmark visible del hero. La UI conserva:

`DALIL`

`Inteligencia tecnológica.`

## Criterios de aceptación

- favicon legible;
- icono PWA reconocible;
- sin clipping;
- sin degradados rotos;
- contraste correcto sobre dark/light;
- render estable en Chromium/Edge;
- render estable en mobile;
- CI y Cloudflare preflight PASS.
