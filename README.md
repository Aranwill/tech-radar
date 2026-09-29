# Dalil

> دليل · Dalīl · guía / indicio / evidencia

**Dalil** es el nombre elegido para el proyecto anteriormente identificado como `Tech Radar`.

Dalil es un radar de información tecnológica orientado a señal, trazabilidad y descubrimiento. La V1 prioriza una experiencia PWA responsive, fuentes originales, visualización estructurada y una base segura para incorporar noticias, papers, repositorios, Hugging Face y ciberseguridad.

El repositorio conserva por ahora el nombre técnico `tech-radar`. Un eventual rename del repositorio o del paquete se tratará como un cambio separado para no mezclar identidad de producto con migraciones técnicas.

## Identidad de producto

- **Nombre:** Dalil
- **Árabe:** دليل
- **Transliteración:** Dalīl / Dalil
- **Sentido adoptado por el proyecto:** guía, indicio/evidencia y orientación entre señales.
- **Tagline actual:** Inteligencia tecnológica.

La elección encaja con los principios del producto: descubrir información relevante, mostrar procedencia, aportar contexto y permitir que el usuario llegue a la fuente original.

Ver [docs/PRODUCT_IDENTITY.md](docs/PRODUCT_IDENTITY.md).

## Foundation

- Next.js + React + TypeScript.
- pnpm 11.28.0 fijado como package manager.
- Tailwind CSS 4 y design tokens propios.
- PWA mínima con manifest y service worker sin caché persistente todavía.
- Tema claro y oscuro.
- Catálogo de UI estructurada inspirado en A2UI: los datos sólo pueden renderizar componentes permitidos.
- Validación de contratos con Zod.
- Headers de seguridad y permisos mínimos.
- CI de typecheck, build y auditoría de dependencias de producción.
- Dependabot para pnpm/npm ecosystem y GitHub Actions.

## Primer datasource real

GitHub REST API es la primera fuente conectada. La V1 consulta un catálogo pequeño y explícito de repositorios públicos, valida la respuesta server-side y la normaliza al mismo contrato `RepositoryBlock` que usa la UI.

No se calcula momentum real todavía: eso requiere snapshots históricos propios.

Ver [docs/GITHUB_SOURCE_V1.md](docs/GITHUB_SOURCE_V1.md).

## Infraestructura remota V1

La baseline propuesta mantiene Dalil disponible sin depender de una PC personal: Cloudflare para frontend/API/persistencia/telemetría y GitHub Actions para scheduler + procesamiento remoto.

También se define una observabilidad geográfica privacy-first: actividad agregada por país, requests/respuestas, errores y latencia, sin almacenar IP ni fingerprinting.

Ver [docs/CLOUD_RUNTIME_OBSERVABILITY_V1.md](docs/CLOUD_RUNTIME_OBSERVABILITY_V1.md).

## Desarrollo local

Requiere Node.js 20.19 o superior y pnpm 11.28.0.

```bash
pnpm install
pnpm typecheck
pnpm dev
```

Luego abrir http://localhost:3000.

`next-env.d.ts` es generado por Next.js y permanece ignorado por Git. El script de typecheck ejecuta `next typegen` antes de TypeScript para garantizar que los tipos generados existan.

> `pnpm-lock.yaml` está versionado y el CI instala dependencias con `pnpm install --frozen-lockfile` para mantener una resolución reproducible.

## Seguridad de dependencias

La configuración del proyecto aplica una espera mínima de 24 horas para versiones recién publicadas y bloquea fuentes transitivas exóticas. pnpm reduce superficie de instalación, pero sigue consumiendo normalmente el registro npm: cambiar de package manager no sustituye la revisión de dependencias, lockfile y auditorías.

## Estado

La interfaz combina contenido de demostración con el primer datasource real de GitHub. Todavía no hay base de datos ni snapshots históricos.

Ver [docs/FOUNDATION.md](docs/FOUNDATION.md) para la base del proyecto.
