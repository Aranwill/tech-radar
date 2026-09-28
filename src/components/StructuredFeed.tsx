import type { UiBlock } from "@/lib/ui-contract";

type StoryBlock = Extract<UiBlock, { kind: "story" }>;
type RepositoryBlock = Extract<UiBlock, { kind: "repository" }>;
type StatBlock = Extract<UiBlock, { kind: "stat" }>;

function StoryCard({ block }: { block: StoryBlock }) {
  return (
    <article className="card card-story">
      <div className="card-topline">
        <span className="source-chip">{block.category}</span>
        <span className="card-meta">{block.age}</span>
      </div>
      <h3>{block.title}</h3>
      <p>{block.summary}</p>
      <div className="card-footer">
        <div>
          <div className="mini-label">Fuente</div>
          <strong>{block.source}</strong>
        </div>
        <a className="card-link" href={block.sourceUrl} target="_blank" rel="noreferrer">
          Abrir original ↗
        </a>
      </div>
      <div className="tag-row" style={{ marginTop: "0.8rem" }}>
        <span className="signal-chip">{block.evidence}</span>
      </div>
    </article>
  );
}

function RepositoryCard({ block }: { block: RepositoryBlock }) {
  return (
    <article className="card card-repository">
      <div className="card-topline">
        <span className="source-chip">GitHub · Emerging</span>
        <span className="card-meta">DEMO</span>
      </div>
      <h3>{block.name}</h3>
      <p>{block.description}</p>
      <div className="repo-metrics">
        <div className="metric">
          <strong>{block.stars.toLocaleString("es-AR")}</strong>
          <span>estrellas</span>
        </div>
        <div className="metric">
          <strong>+{block.growth7d}%</strong>
          <span>7 días</span>
        </div>
        <div className="metric">
          <strong>{block.language}</strong>
          <span>lenguaje</span>
        </div>
      </div>
      <div className="sparkline" aria-label="Tendencia de demostración">
        {block.trend.map((value, index) => (
          <span key={index} style={{ height: value + "%" }} />
        ))}
      </div>
      <div className="tag-row">
        {block.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="card-footer">
        <span className="card-meta">snapshot propio</span>
        <a className="card-link" href={block.url} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </div>
    </article>
  );
}

function StatCard({ block }: { block: StatBlock }) {
  return (
    <article className="card card-stat">
      <span className="mini-label">{block.label}</span>
      <div className="stat-value">{block.value}</div>
      <div className="stat-row">
        <span className="stat-delta">{block.delta}</span>
      </div>
      <p style={{ marginTop: "0.8rem", marginBottom: 0 }}>{block.note}</p>
    </article>
  );
}

export function StructuredFeed({ blocks }: { blocks: UiBlock[] }) {
  return (
    <div className="feed-grid">
      {blocks.map((block) => {
        switch (block.kind) {
          case "story":
            return <StoryCard block={block} key={block.id} />;
          case "repository":
            return <RepositoryCard block={block} key={block.id} />;
          case "stat":
            return <StatCard block={block} key={block.id} />;
        }
      })}
    </div>
  );
}
