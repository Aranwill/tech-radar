import type { RepositoryBlock } from "@/lib/ui-contract";

type MetricIconName = "star" | "fork" | "code" | "calendar" | "issue" | "history" | "users";

function MetricIcon({ name }: { name: MetricIconName }) {
  const common = {
    className: "metric-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "star":
      return (
        <svg {...common}>
          <path d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6L12 16.76 6.6 19.6l1.03-6-4.36-4.25 6.03-.88L12 3Z" />
        </svg>
      );
    case "fork":
      return (
        <svg {...common}>
          <circle cx="6" cy="5" r="2" />
          <circle cx="18" cy="5" r="2" />
          <circle cx="12" cy="19" r="2" />
          <path d="M6 7v2a4 4 0 0 0 4 4h2m6-6v2a4 4 0 0 1-4 4h-2v4" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case "issue":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5h.01" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5M12 7v5l3 2" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
  }
}

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

function formatContributorCount(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return value > 999 ? "999+" : value.toLocaleString("es-AR");
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
            <strong className="metric-value-line">
              <MetricIcon name="star" />
              {block.stars.toLocaleString("es-AR")}
            </strong>
            <span className="metric-label">estrellas</span>
          </div>
          <div className="metric">
            <strong className="metric-value-line">
              <MetricIcon name="fork" />
              {typeof block.growth7d === "number"
                ? `+${block.growth7d}%`
                : (block.forks ?? 0).toLocaleString("es-AR")}
            </strong>
            <span className="metric-label">{typeof block.growth7d === "number" ? "7 días" : "forks"}</span>
          </div>
          <div className="metric">
            <strong className="metric-value-line">
              <MetricIcon name="code" />
              {block.language}
            </strong>
            <span className="metric-label">lenguaje</span>
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
            <span className="status-item">
              <MetricIcon name="calendar" />
              {updatedAt ? `Actualizado ${updatedAt}` : "Actualización sin dato"}
            </span>
            <span className="status-item">
              <MetricIcon name="issue" />
              {(block.openIssuesAndPullRequests ?? 0).toLocaleString("es-AR")} issues/PR
            </span>
            <span className="status-item">
              <MetricIcon name="history" />
              Histórico pendiente
            </span>
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

        <div
          className="community-row"
          title={
            typeof block.contributorCount === "number"
              ? `${block.contributorCount.toLocaleString("es-AR")} contribuidores públicos observados`
              : "Conteo de contribuidores no disponible en esta actualización"
          }
        >
          <span className="community-label">
            <MetricIcon name="users" />
            Contribuidores
          </span>
          <strong>{formatContributorCount(block.contributorCount)}</strong>
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
