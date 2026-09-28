# OWASP Security Baseline V1

## Alcance

Este documento convierte marcos OWASP en controles concretos para Tech Radar. Es una baseline de ingeniería, no una certificación ni una declaración de cobertura total.

Referencias adoptadas:

- OWASP Top 10:2025.
- OWASP ASVS 5.0.
- OWASP GenAI LLM Top 10 2026.
- OWASP Top 10 for Agentic Applications 2026.
- OWASP AISVS 1.0.

## Web: OWASP Top 10:2025

| Riesgo | Baseline actual |
| --- | --- |
| A01 Broken Access Control | Sin endpoints mutables ni autenticación todavía. Datasources externos usan rutas fijas/allowlist, no URLs suministradas por usuario. Futuras mutaciones serán deny-by-default y autorizadas server-side. |
| A02 Security Misconfiguration | Security headers, CSP, poweredByHeader deshabilitado, permisos mínimos en Actions, configuración de producción separada y sin secretos cliente. |
| A03 Software Supply Chain Failures | pnpm fijado, lockfile congelado, cooldown de paquetes, bloqueo de subdependencias exóticas, Dependabot, audit y Actions fijadas a SHA. |
| A04 Cryptographic Failures | HTTPS obligatorio para URLs externas; secretos sólo server-side. No existe almacenamiento sensible ni criptografía propia en V1. |
| A05 Injection | Zod en fronteras externas, React escaping, catálogo UI explícito y prohibición automatizada de eval, new Function, document.write y dangerouslySetInnerHTML. |
| A06 Insecure Design | Threat model explícito, trust boundaries y feature gates. A2UI/IA no pueden introducir código arbitrario. |
| A07 Authentication Failures | No hay autenticación en V1. Antes de agregarla se requiere diseño de sesión, MFA/provider y controles ASVS aplicables. |
| A08 Software or Data Integrity Failures | Lockfile, Actions inmutables, validación de datos upstream y procedencia explícita. |
| A09 Security Logging & Alerting Failures | Logs server-side de fallos de proveedor sin secretos. Observabilidad/alertas de producción quedan como gate previo al despliegue público estable. |
| A10 Mishandling of Exceptional Conditions | Timeouts, tamaño máximo de respuesta, content-type esperado, resultados parciales y errores genéricos hacia el cliente. |

## ASVS

OWASP Top 10 se usa para priorizar riesgos. ASVS 5.0 se adopta como referencia verificable para controles técnicos. No se marcará un requisito ASVS como PASS sin prueba reproducible o evidencia del despliegue.

Objetivo inicial: baseline equivalente a controles esenciales aplicables a una aplicación pública sin autenticación ni datos sensibles. Los requisitos se ampliarán cuando aparezcan login, persistencia, formularios o APIs mutables.

## IA: OWASP GenAI LLM Top 10 2026

La edición 2026 incluye Prompt Injection, Sensitive Information Disclosure, Excessive Agency, Supply Chain, Data and Model Poisoning, Unbounded Consumption, Misinformation, Hidden Context Exposure, Vector and Embedding Weaknesses e Improper Output Handling.

Controles fundacionales antes de conectar un modelo:

1. Modelo sin secretos y con mínimo contexto.
2. Input recuperado, páginas, papers, repos y tool output tratados como datos no confiables.
3. Output validado por schemas y lógica determinista antes de entrar a UI, almacenamiento o acciones.
4. Sin HTML/JS/código arbitrario generado.
5. Budgets de tokens, requests, tiempo y costo.
6. Provenance y fuente original visibles para reducir confianza indebida/misinformation.
7. Sin memoria/vector store hasta definir aislamiento, poisoning, borrado y trazabilidad.
8. Dependencias, modelos y proveedores sometidos a política de supply chain.

## Agentic AI: OWASP Agentic Top 10 2026

Si el proyecto incorpora agentes o MCP, se aplican además controles contra: Agent Goal Hijack, Tool Misuse, Identity & Privilege Abuse, Agentic Supply Chain Vulnerabilities, Unexpected Code Execution, Memory & Context Poisoning, Insecure Inter-Agent Communication, Cascading Failures, Human-Agent Trust Exploitation y Rogue Agents.

Reglas no negociables para esa fase:

- tools en allowlist;
- credenciales por herramienta/servicio con mínimo privilegio;
- ninguna shell o ejecución dinámica por defecto;
- separación fuerte entre instrucciones confiables y contenido externo;
- aprobación humana para publicar, borrar, enviar, pagar, cambiar permisos o ejecutar acciones equivalentes;
- límites de propagación/cascada y circuit breakers;
- logs/auditoría de tool calls sin secretos;
- memoria persistente con procedencia, scopes y rollback.

## AISVS 1.0

AISVS se adopta como checklist verificable cuando se conecte IA. Para una futura versión pública con IA se apunta, como mínimo, al conjunto de controles apropiado para un sistema customer-facing, sujeto al alcance real.

Áreas que deben tener evidencia antes de habilitar IA en producción:

- integridad y procedencia de datos;
- input validation;
- lifecycle y change control del modelo;
- configuración/despliegue;
- identidad y acceso;
- supply chain de modelos;
- output control;
- memory/embeddings/vector DB;
- agentic orchestration;
- MCP;
- adversarial robustness;
- monitoring/logging/anomaly detection.

## Automatización

pnpm security:baseline falla CI ante regresiones simples pero relevantes. No reemplaza SAST, DAST, pentesting ni revisión humana.
