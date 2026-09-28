import type { RepositoryBlock } from "@/lib/ui-contract";

function formatUpdatedAt(value?: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function RepositoryCard({
  block,
  className = "card-repository",
}: {
  block: RepositoryBlock;
  className?: string;
}) {
  const isLive = block.dataState === "live";
  const updatedAt = formatUpdatedAt(block.updatedAt);
  const hasTags = block.tags.length > 0;

  return (
    <article className={`card repository-card ${className}`}>
      <div className="card-topline">
        <span className="source-chip">GitHub</span>
      </div>

      <div className="repository-card-main">
        <h3>{block.name}</h3>
        <p className={block.description.startsWith("Repositorio sin descripción") ? "repo-description is-empty" : "repo-description"}>
          {block.description}
        </p>

        <div className="repo-metrics" aria-label="Métricas actuales del repositorio">
          <div className="metric">
            <strong>{block.stars.toLocaleString("es-AR")}</strong>
            <span>estrellas</span>
          </div>
          <div className="metric">
            <strong>
              {typeof block.growth7d === "number"
                ? `+${block.growth7d}%`
                : (block.forks ?? 0).toLocaleString("es-AR")}
            </strong>
            <span>{typeof block.growth7d === "number" ? "7 días" : "forks"}</span>
          </div>
          <div className="metric">
            <strong>{block.language}</strong>
            <span>lenguaje</span>
          </div>
        </div>

        {block.trend ? (
          <div className="sparkline" aria-label="Tendencia histórica">
            {block.trend.map((value, index) => (
              <span key={index} style={{ height: value + "%" }} />
            ))}
          </div>
        ) : (
          <div className="repo-status-row" aria-label="Estado del repositorio">
            <span>{updatedAt ? `Actualizado ${updatedAt}` : "Actualización sin dato"}</span>
            <span>{(block.openIssuesAndPullRequests ?? 0).toLocaleString("es-AR")} issues/PR abiertas</span>
            <span>Histórico pendiente</span>
          </div>
        )}

        <div className="tag-row" aria-label="Topics del repositorio">
          {hasTags ? (
            block.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))
          ) : (
            <span className="tag tag-placeholder">Sin topics públicos</span>
          )}
        </div>
      </div>

      <div className="card-footer">
        <span className="card-meta">
          {isLive ? "Fuente primaria · API oficial" : "Snapshot propio"}
        </span>
        <a className="card-link" href={block.url} target="_blank" rel="noreferrer">
          Abrir repo ↗
        </a>
      </div>
    </article>
  );
}
