# Tech Radar

> Nombre provisional. Proyecto independiente.

Tech Radar es un radar de información tecnológica orientado a señal, trazabilidad y descubrimiento. La V1 prioriza una experiencia PWA responsive, fuentes originales, visualización estructurada y una base segura para incorporar noticias, papers, repositorios, Hugging Face y ciberseguridad.

## Foundation

- Next.js + React + TypeScript.
- Tailwind CSS 4 y design tokens propios.
- PWA mínima con manifest y service worker sin caché persistente todavía.
- Tema claro, oscuro y sistema.
- Catálogo de UI estructurada inspirado en A2UI: los datos sólo pueden renderizar componentes permitidos.
- Validación de contratos con Zod.
- Headers de seguridad y permisos mínimos.
- CI de typecheck, build y auditoría de dependencias de producción.
- Dependabot para npm y GitHub Actions.

## Desarrollo local

Requiere Node.js 20.19 o superior.

```bash
npm install
npm run dev
```

Luego abrir http://localhost:3000.

> El primer `npm install` generará `package-lock.json`. Debe versionarse antes de considerar cerrada la Foundation para asegurar instalaciones reproducibles.

## Estado

La interfaz usa datos de demostración. Todavía no hay ingestión real ni conexión a APIs externas.

Ver [docs/FOUNDATION.md](docs/FOUNDATION.md) para alcance, decisiones y próximos pasos.
