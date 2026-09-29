import { LiveGithubRepositories } from "@/components/LiveGithubRepositories";
import { StructuredFeed } from "@/components/StructuredFeed";
import { ThemeToggle } from "@/components/ThemeToggle";
import { demoDashboard } from "@/lib/demo-data";

const categories = ["Must Read", "IA", "Research", "Big Tech", "GitHub", "Hugging Face", "Cyber", "Tech"];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="hero-copy">
          <div className="brand-lockup" aria-label="Dalil">
            <img
              className="brand-mark"
              src="/brand/dalil-mark-transparent.svg"
              alt=""
              width="56"
              height="56"
              aria-hidden="true"
            />
            <span className="brand-wordmark" aria-hidden="true" />
            <span className="sr-only">DALIL</span>
          </div>
          <h1>Inteligencia tecnológica.</h1>
          <p className="lede">
            Noticias, investigación y open source agrupados por historias, con fuente original y contexto visible.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="context-grid" aria-label="Contexto de Dalil">
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
        <span className="footer-legal">© 2026 Dalil. Todos los derechos reservados.</span>
        <span className="footer-made">
          Hecho con <span className="footer-heart" role="img" aria-label="amor">❤️</span> por <strong>Aranwill</strong>.
        </span>
      </footer>
    </main>
  );
}
