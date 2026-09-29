import { LiveGithubRepositories } from "@/components/LiveGithubRepositories";
import { StructuredFeed } from "@/components/StructuredFeed";
import { ThemeToggle } from "@/components/ThemeToggle";
import { demoDashboard } from "@/lib/demo-data";

const categories = ["Must Read", "IA", "Research", "Big Tech", "GitHub", "Hugging Face", "Cyber", "Tech"];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand-name">DALIL</div>
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
          <span className="context-label">Fuentes activas</span>
          <strong>1 conectada</strong>
          <small>GitHub REST API habilitada con catálogo curado y caché server-side.</small>
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
      <LiveGithubRepositories />

      <footer className="footer-note">
        <strong>Dalil</strong>
        <span>source-first · datos verificables · mobile-first · PWA</span>
      </footer>
    </main>
  );
}
