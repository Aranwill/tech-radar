import { createHash } from "node:crypto";

export const GITHUB_SOURCE_ID = "source-github-rest";
export const SNAPSHOT_BUCKET_HOURS = 6;

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function validateRepositoryConfig(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.repositories) ||
    value.repositories.length < 1 ||
    value.repositories.length > 50
  ) {
    throw new Error("Catálogo GitHub inválido.");
  }

  const repositories = value.repositories.map((repository) => {
    if (typeof repository !== "string" || !REPOSITORY_PATTERN.test(repository)) {
      throw new Error("Repositorio curado inválido.");
    }
    return repository;
  });

  if (new Set(repositories).size !== repositories.length) {
    throw new Error("El catálogo GitHub contiene repositorios duplicados.");
  }

  return repositories;
}

export function floorToSnapshotBucket(value, bucketHours = SNAPSHOT_BUCKET_HOURS) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Timestamp de snapshot inválido.");
  }

  if (!Number.isInteger(bucketHours) || bucketHours < 1 || 24 % bucketHours !== 0) {
    throw new Error("El bucket de snapshots debe dividir el día UTC.");
  }

  date.setUTCMinutes(0, 0, 0);
  date.setUTCHours(Math.floor(date.getUTCHours() / bucketHours) * bucketHours);
  return date.toISOString();
}

export function hashRepositoryContent(observation) {
  const stable = JSON.stringify({
    fullName: observation.fullName,
    description: observation.description ?? null,
    htmlUrl: observation.htmlUrl,
    language: observation.language ?? null,
    updatedAt: observation.updatedAt ?? null,
  });

  return createHash("sha256").update(stable).digest("hex");
}

export function buildSnapshotPersistenceBatch({
  observedAt,
  observations,
  failures = 0,
  runKind = "scheduled",
}) {
  if (!Array.isArray(observations) || observations.length === 0) {
    throw new Error("Se requiere al menos una observación para persistir.");
  }

  if (!["scheduled", "manual", "backfill"].includes(runKind)) {
    throw new Error("runKind inválido.");
  }

  if (!Number.isInteger(failures) || failures < 0) {
    throw new Error("Cantidad de fallos inválida.");
  }

  const normalizedObservedAt = new Date(observedAt).toISOString();
  const runId = "github-snapshot:" + normalizedObservedAt;
  const status = failures === 0 ? "succeeded" : "partial";
  const totalSeen = observations.length + failures;

  const batch = [
    {
      sql: `INSERT INTO sources (
        id, kind, name, base_url, enabled, created_at, updated_at
      ) VALUES (?, 'github', 'GitHub REST API', 'https://api.github.com', 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        enabled = 1,
        updated_at = excluded.updated_at`,
      params: [GITHUB_SOURCE_ID, normalizedObservedAt, normalizedObservedAt],
    },
    {
      sql: `INSERT INTO ingestion_runs (
        id, source_id, run_kind, status, started_at,
        finished_at, items_seen, items_written, items_failed, error_code
      ) VALUES (?, ?, ?, 'running', ?, NULL, 0, 0, 0, NULL)
      ON CONFLICT(id) DO UPDATE SET
        run_kind = excluded.run_kind,
        status = 'running',
        started_at = excluded.started_at,
        finished_at = NULL,
        items_seen = 0,
        items_written = 0,
        items_failed = 0,
        error_code = NULL`,
      params: [runId, GITHUB_SOURCE_ID, runKind, normalizedObservedAt],
    },
  ];

  for (const observation of observations) {
    const itemId = "github-" + observation.githubId;
    const contentHash = hashRepositoryContent(observation);

    batch.push(
      {
        sql: `INSERT INTO content_items (
          id, source_id, external_id, kind, canonical_url, title, summary,
          published_at, source_updated_at, first_seen_at, last_seen_at,
          content_hash, state
        ) VALUES (?, ?, ?, 'repository', ?, ?, ?, NULL, ?, ?, ?, ?, 'live')
        ON CONFLICT(source_id, external_id) DO UPDATE SET
          canonical_url = excluded.canonical_url,
          title = excluded.title,
          summary = excluded.summary,
          source_updated_at = excluded.source_updated_at,
          last_seen_at = excluded.last_seen_at,
          content_hash = excluded.content_hash,
          state = 'live'`,
        params: [
          itemId,
          GITHUB_SOURCE_ID,
          String(observation.githubId),
          observation.htmlUrl,
          observation.fullName,
          observation.description ?? null,
          observation.updatedAt ?? null,
          normalizedObservedAt,
          normalizedObservedAt,
          contentHash,
        ],
      },
      {
        sql: `INSERT INTO repository_snapshots (
          item_id, observed_at, stars, forks, open_issues_and_pull_requests,
          contributor_count, language, source_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_id, observed_at) DO UPDATE SET
          stars = excluded.stars,
          forks = excluded.forks,
          open_issues_and_pull_requests = excluded.open_issues_and_pull_requests,
          contributor_count = excluded.contributor_count,
          language = excluded.language,
          source_updated_at = excluded.source_updated_at`,
        params: [
          itemId,
          normalizedObservedAt,
          observation.stars,
          observation.forks,
          observation.openIssuesAndPullRequests,
          observation.contributorCount ?? null,
          observation.language ?? null,
          observation.updatedAt ?? null,
        ],
      },
    );
  }

  batch.push({
    sql: `UPDATE ingestion_runs
      SET status = ?, finished_at = ?, items_seen = ?, items_written = ?,
          items_failed = ?, error_code = ?
      WHERE id = ?`,
    params: [
      status,
      normalizedObservedAt,
      totalSeen,
      observations.length,
      failures,
      failures > 0 ? "upstream_partial_failure" : null,
      runId,
    ],
  });

  return { batch, runId, status };
}
