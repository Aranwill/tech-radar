# Tech Radar

> Nombre provisional. Proyecto independiente.

Tech Radar es un radar de información tecnológica orientado a señal, trazabilidad y descubrimiento. La V1 prioriza una experiencia PWA responsive, fuentes originales, visualización estructurada y una base segura para incorporar noticias, papers, repositorios, Hugging Face y ciberseguridad.

## Foundation

- Next.js + React + TypeScript.
- pnpm 11.28.0 fijado como package manager.
- Tailwind CSS 4 y design tokens propios.
- PWA mínima con manifest y service worker sin caché persistente todavía.
- Tema claro, oscuro y sistema.
- Catálogo de UI estructurada inspirado en A2UI: los datos sólo pueden renderizar componentes permitidos.
- Validación de contratos con Zod.
- Headers de seguridad y permisos mínimos.
- CI de typecheck, build y auditoría de dependencias de producción.
- Dependabot para pnpm/npm ecosystem y GitHub Actions.

## Desarrollo local

Requiere Node.js 20.19 o superior y pnpm 11.28.0.

```bash
pnpm install
pnpm typecheck
pnpm dev
```

Luego abrir http://localhost:3000.

`next-env.d.ts` es generado por Next.js y permanece ignorado por Git. El script de typecheck ejecuta `next typegen` antes de TypeScript para garantizar que los tipos generados existan.

> El primer `pnpm install` generará `pnpm-lock.yaml`. Debe versionarse antes de considerar cerrada la Foundation para asegurar instalaciones reproducibles. Hasta entonces el CI usa `--no-frozen-lockfile` de forma temporal.

## Seguridad de dependencias

La configuración del proyecto aplica una espera mínima de 24 horas para versiones recién publicadas y bloquea fuentes transitivas exóticas. pnpm reduce superficie de instalación, pero sigue consumiendo normalmente el registro npm: cambiar de package manager no sustituye la revisión de dependencias, lockfile y auditorías.

## Estado

La interfaz usa datos de demostración. Todavía no hay ingestión real ni conexión a APIs externas.

Ver [docs/FOUNDATION.md](docs/FOUNDATION.md) para alcance, decisiones y próximos pasos.
