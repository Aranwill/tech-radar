# Security

## Estado

El repositorio es público. La aplicación todavía no está desplegada como servicio de producción.

## Baseline

El proyecto usa como referencias:

- OWASP Top 10:2025 para riesgos web.
- OWASP ASVS 5.0 para requisitos verificables de seguridad web.
- OWASP GenAI LLM Top 10 2026 para funciones futuras basadas en modelos.
- OWASP Top 10 for Agentic Applications 2026 para cualquier capacidad futura con herramientas/agencia.
- OWASP AISVS 1.0 como baseline verificable específico para IA.

Esto no constituye una afirmación de cumplimiento completo. Cada control debe tener evidencia verificable antes de declararse satisfecho.

Ver docs/security/OWASP_BASELINE.md y docs/security/THREAT_MODEL.md.

## Principios

- Deny-by-default para capacidades, acciones y componentes.
- Secretos sólo del lado servidor y nunca versionados.
- Entradas externas tratadas como no confiables y validadas antes de persistir o renderizar.
- UI estructurada mediante catálogo explícito de componentes.
- No se permite HTML, JavaScript, componentes remotos ni eval provenientes de fuentes o modelos.
- URLs externas del contrato de UI deben usar HTTPS y, cuando corresponda, allowlists de host.
- Endpoints de ingestión usan allowlists, timeouts, límites de tamaño aplicados durante streaming, validación de tipo de contenido y mitigación SSRF.
- Redirecciones externas no se siguen automáticamente; cuando el runtime exige `manual`, el status y origin se validan antes de aceptar la respuesta.
- Credenciales de escritura D1 en CI se limitan al step de persistencia y la persistencia remota se restringe a `main`.
- Permisos de GitHub Actions mínimos por defecto.
- Actions de terceros fijadas a commits inmutables.
- Dependencias auditadas y actualizadas de manera controlada.
- pnpm fijado a versión exacta; no se usa npm como package manager del proyecto.
- Versiones recién publicadas tienen un cooldown mínimo de 24 horas salvo excepción explícita y revisada.
- Dependencias transitivas no pueden resolver fuentes Git/tarball exóticas.
- El lockfile es obligatorio y el CI usa instalación congelada.
- Errores externos se degradan de forma segura sin exponer stack traces, tokens ni respuestas internas.
- Logs sin credenciales, tokens ni contenido sensible.

## Tráfico del navegador y extensiones

Dalil no incorpora actualmente analytics, trackers ni scripts de telemetría de terceros en el cliente.

La política CSP limita `connect-src` a orígenes declarados por la aplicación. Las consultas a GitHub se realizan server-side y no requieren habilitar `api.github.com` en la CSP del navegador.

Durante el desarrollo, extensiones del navegador, antivirus y software de protección local pueden inyectar scripts o generar XHR propios que aparecen en DevTools como si convivieran con la página. Ese tráfico pertenece al entorno local del navegador y está fuera del trust boundary de Dalil.

Para atribuir una solicitud observada en DevTools:

- revisar el dominio destino y el iniciador de la request;
- reproducir en un perfil limpio con extensiones deshabilitadas;
- no agregar dominios de extensiones/antivirus a la allowlist de Dalil sólo para silenciar esas requests;
- no clasificar una request como tráfico de Dalil si su iniciador no pertenece al bundle/aplicación y su destino no forma parte de los orígenes declarados.

La presencia de tráfico inyectado por una extensión no debe confundirse con una dependencia, tracker o telemetría de Dalil.

## IA / agentes

Mientras no exista una feature de IA, no hay un modelo dentro del trust boundary de producción.

Cuando se incorpore IA:

- la salida del modelo será no confiable hasta validación determinista;
- contenido recuperado y tool output se etiquetarán como datos no confiables, nunca como instrucciones;
- el modelo no recibirá secretos ni tokens;
- acciones con efectos requerirán allowlists, mínimo privilegio y aprobación humana según riesgo;
- no se habilitará memoria persistente sin controles contra poisoning y procedencia;
- no se permitirá ejecución arbitraria de código, HTML o herramientas desde texto del modelo;
- habrá límites de tiempo, volumen, costo y llamadas para evitar consumo no acotado.

## Reporte de vulnerabilidades

No abrir Issues públicas con detalles explotables de una vulnerabilidad.

Usar GitHub Security Advisories / Private vulnerability reporting cuando esté habilitado para el repositorio. Si esa opción no estuviera disponible, contactar al propietario del repositorio de forma privada.

## Hardening pre-crecimiento

El relevamiento integral previo a ampliar fuentes y runtime está registrado en `docs/security/PRE_GROWTH_HARDENING_V1.md`. Findings abiertos de supply chain continúan siendo bloqueantes hasta cierre verificable.
