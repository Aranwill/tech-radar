import { dashboardSchema } from "@/lib/ui-contract";

export const demoDashboard = dashboardSchema.parse({
  version: "0.1",
  demo: true,
  blocks: [
    {
      id: "story-a2ui",
      kind: "story",
      category: "Research / UI",
      title: "Una capa declarativa puede transformar datos en interfaces seguras y consistentes",
      summary:
        "Ejemplo visual del enfoque que queremos explorar: el modelo entrega datos estructurados y el cliente decide qué componente permitido renderizar, sin aceptar HTML o JavaScript arbitrario.",
      source: "A2UI Project",
      sourceUrl: "https://github.com/a2ui-project/a2ui",
      age: "demo",
      evidence: "Fuente primaria",
    },
    {
      id: "stat-sources",
      kind: "stat",
      label: "Fuentes agrupadas",
      value: "24",
      delta: "+6 esta semana",
      note: "Dato de demostración. En producción será una métrica derivada de historias y procedencia.",
    },
    {
      id: "stat-repos",
      kind: "stat",
      label: "Repos emergentes",
      value: "8",
      delta: "3 con aceleración",
      note: "El momentum se calculará con snapshots propios, no sólo con estrellas acumuladas.",
    },
    {
      id: "stat-research",
      kind: "stat",
      label: "Papers relevantes",
      value: "17",
      delta: "5 Must Read",
      note: "La selección combinará autoridad, novedad, impacto, corroboración y relevancia temática.",
    },
  ],
});
