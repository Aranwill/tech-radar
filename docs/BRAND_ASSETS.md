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

Assets canónicos candidatos:

- `public/brand/dalil-mark.svg`
- `public/brand/dalil-mark-transparent.svg`
- `public/brand/dalil-wordmark-mask.svg`
- `public/brand/dalil-wordmark-reference.svg`

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

La imagen de referencia elegida por el propietario es la autoridad visual del sistema completo. La vectorización se traza sobre esa referencia para conservar tanto la silueta del isotipo como el wordmark DALIL —incluida la A triangular— y no debe reinterpretarse con tipografías genéricas.

1. Debe reconocerse como `D` antes que como ilustración decorativa.
2. Debe preservar la D exterior curva, el pilar izquierdo separado y el swoosh inferior de la referencia.
3. El radar debe seguir visible a 32–64 px.
4. No se deben añadir detalles internos que sólo funcionen en alta resolución.
5. El azul eléctrico/cyan es parte de la dirección visual, pero el símbolo debe admitir versión monocromática.
6. El fondo oscuro forma parte del asset de PWA actual; existe una variante transparente para UI.
7. El logo no debe sustituir información funcional ni reducir accesibilidad.

## Integración candidata

En esta rama:

- `public/icon.svg` usa el isotipo con fondo oscuro para favicon/PWA;
- `src/app/icon.svg` usa el mismo vector;
- `public/brand/dalil-mark-transparent.svg` ofrece el isotipo sin fondo para la UI;
- `public/brand/dalil-wordmark-mask.svg` conserva la geometría exacta del wordmark y permite color adaptativo dark/light;
- `public/brand/dalil-wordmark-reference.svg` conserva la versión plateada de referencia;
- manifest y metadata siguen apuntando a `/icon.svg`;
- el hero integra el isotipo trazado y el wordmark trazado; ya no usa texto genérico para DALIL.

Composición responsive:

```text
desktop:
[D-radar] DALIL
Inteligencia tecnológica.

mobile:
[D-radar]
  DALIL
Inteligencia tecnológica.
```

El selector de tema conserva su posición independiente arriba a la derecha en responsive.

La UI no incorpora navegación ficticia del mockup: sólo se aplican componentes de identidad que ya tienen función real.

## Criterios de aceptación

- favicon legible;
- icono PWA reconocible;
- sin clipping;
- sin degradados rotos;
- contraste correcto sobre dark/light;
- render estable en Chromium/Edge;
- render estable en mobile;
- CI y Cloudflare preflight PASS.
