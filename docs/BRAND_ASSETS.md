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

Assets canónicos proporcionados por el propietario:

- `public/brand/dalil-mark.svg` — SVG exacto del isotipo;
- `public/brand/dalil-wordmark.svg` — SVG exacto del wordmark DALIL.

No se mantienen reinterpretaciones geométricas alternativas como fuente de producción.

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

Los SVG entregados por el propietario son la autoridad visual y los assets canónicos. No deben redibujarse ni reinterpretarse salvo una modificación explícitamente aprobada.

1. Debe reconocerse como `D` antes que como ilustración decorativa.
2. Debe preservar la D exterior curva, el pilar izquierdo separado y el swoosh inferior de la referencia.
3. El radar debe seguir visible a 32–64 px.
4. No se deben añadir detalles internos que sólo funcionen en alta resolución.
5. El azul eléctrico/cyan es parte de la dirección visual, pero el símbolo debe admitir versión monocromática.
6. El fondo oscuro forma parte del asset de PWA actual; existe una variante transparente para UI.
7. El logo no debe sustituir información funcional ni reducir accesibilidad.

## Integración candidata

En esta rama:

- `public/icon.svg` y `src/app/icon.svg` reutilizan el isotipo SVG exacto;
- el hero usa `public/brand/dalil-mark.svg` directamente;
- el wordmark usa `public/brand/dalil-wordmark.svg` como máscara exacta para conservar geometría y adaptar contraste entre dark/light;
- manifest y metadata siguen apuntando a `/icon.svg`;
- dark mode adopta `#01081A`, muestreado del fondo de la referencia del logo, con superficies azuladas compatibles.

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
