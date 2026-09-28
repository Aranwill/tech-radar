import { StructuredFeed } from "@/components/StructuredFeed";
import { ThemeToggle } from "@/components/ThemeToggle";
import { demoDashboard } from "@/lib/demo-data";

const categories = ["Must Read", "IA", "Research", "Big Tech", "GitHub", "Hugging Face", "Cyber", "Tech"];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">CODENAME · TECH RADAR</div>
          <h1>Señal tecnológica, sin ruido.</h1>
          <p className="lede">
            Noticias, investigación y open source agrupados por historias, con fuente original y contexto visible.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="context-grid" aria-label="Contexto del radar">
        <article className="context-card">
          <span className="context-label">Ubicación</span>
          <strong>Sin configurar</strong>
          <small>La geolocalización requerirá permiso explícito del navegador.</small>
        </article>
        <article className="context-card">
          <span className="context-label">Ventana</span>
          <strong>Hoy</strong>
          <small>Próximamente: 7 días y 30 días.</small>
        </article>
        <article className="context-card">
          <span className="context-label">Estado</span>
          <strong>Foundation</strong>
          <small>Datos de demostración · sin ingestión externa.</small>
        </article>
      </section>

      <nav className="category-strip" aria-label="Categorías">
        {categories.map((category, index) => (
          <span className={index === 0 ? "category active" : "category"} key={category}>
            {category}
          </span>
        ))}
      </nav>

      <section className="section-heading">
        <div>
          <span className="eyebrow">MUST READ</span>
          <h2>Lo que merece tu atención</h2>
        </div>
        <span className="demo-badge">DEMO</span>
      </section>

      <StructuredFeed blocks={demoDashboard.blocks} />

      <footer className="footer-note">
        <strong>Foundation 0.1</strong>
        <span>UI estructurada · source-first · mobile-first · PWA</span>
      </footer>
    </main>
  );
}
