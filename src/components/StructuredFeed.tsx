import { RepositoryCard } from "@/components/RepositoryCard";
import type { UiBlock } from "@/lib/ui-contract";

type StoryBlock = Extract<UiBlock, { kind: "story" }>;
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
