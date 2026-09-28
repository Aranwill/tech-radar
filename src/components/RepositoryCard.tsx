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

  return (
    <article className={`card ${className}`}>
      <div className="card-topline">
        <span className="source-chip">{isLive ? "GitHub · Live" : "GitHub · Snapshot"}</span>
        <span className="card-meta">{isLive ? "LIVE" : "DEMO"}</span>
      </div>
      <h3>{block.name}</h3>
      <p>{block.description}</p>

      <div className="repo-metrics">
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
        <div className="repo-status-row">
          <span>{updatedAt ? `Actualizado ${updatedAt}` : "Sin histórico todavía"}</span>
          <span>{(block.openIssues ?? 0).toLocaleString("es-AR")} issues abiertas</span>
        </div>
      )}

      <div className="tag-row">
        {block.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="card-footer">
        <span className="card-meta">{isLive ? "GitHub REST API" : "snapshot propio"}</span>
        <a className="card-link" href={block.url} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </div>
    </article>
  );
}
