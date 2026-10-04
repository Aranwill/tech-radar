import { createHash } from "node:crypto";

export const GITHUB_SOURCE_ID = "source-github-rest";
export const SNAPSHOT_BUCKET_HOURS = 6;

const REPOSITORY_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

function parseIso(value, fieldName) {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new Error(fieldName + " inválido.");
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(fieldName + " inválido.");
  }

  return date.toISOString();
}

function assertSafeNonNegativeInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(fieldName + " debe ser un entero seguro no negativo.");
  }
}

export function validateRepositoryIdentifier(repository) {
  if (typeof repository !== "string") {
    throw new Error("Repositorio curado inválido.");
  }

  const parts = repository.split("/");
  if (parts.length !== 2) {
    throw new Error("Repositorio curado inválido.");
  }

  for (const segment of parts) {
    if (
      !REPOSITORY_SEGMENT_PATTERN.test(segment) ||
      segment === "." ||
      segment === ".."
    ) {
      throw new Error("Repositorio curado inválido.");
    }
  }

  return repository;
}

export function repositoryApiPath(repository) {
  const validated = validateRepositoryIdentifier(repository);
  const [owner, name] = validated.split("/");
  return "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name);
}

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

  const repositories = value.repositories.map(validateRepositoryIdentifier);

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

export function resolveSnapshotRunOptions(args, now = new Date()) {
  if (!Array.isArray(args)) {
    throw new Error("Argumentos de snapshot inválidos.");
  }

  let runKind = null;
  let persist = false;

  for (const arg of args) {
    if (arg === "--manual" || arg === "--scheduled") {
      const nextRunKind = arg === "--manual" ? "manual" : "scheduled";
      if (runKind !== null) {
        throw new Error("El modo de ejecución no puede repetirse ni combinarse.");
      }
      runKind = nextRunKind;
      continue;
    }

    if (arg === "--persist") {
      if (persist) {
        throw new Error("--persist no puede repetirse.");
      }
      persist = true;
      continue;
    }

    if (arg === "--backfill" || arg.startsWith("--at=")) {
      throw new Error(
        "Backfill/timestamp override no habilitado: el collector live sólo observa el bucket UTC corriente.",
      );
    }

    throw new Error("Argumento de snapshot no reconocido: " + arg);
  }

  if (runKind === null) {
    throw new Error("Se requiere modo explícito --manual o --scheduled.");
  }

  if (runKind === "scheduled" && !persist) {
    throw new Error("--scheduled requiere --persist.");
  }

  return Object.freeze({
    observedAt: floorToSnapshotBucket(now),
    runKind,
    persist,
  });
}

function validateExecutionId(value) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(value)
  ) {
    throw new Error("executionId inválido.");
  }
  return value;
}

function validateSnapshotObservation(observation) {
  if (!observation || typeof observation !== "object") {
    throw new Error("Observación GitHub inválida.");
  }

  assertSafeNonNegativeInteger(observation.githubId, "githubId");
  if (observation.githubId === 0) {
    throw new Error("githubId debe ser positivo.");
  }

  const fullName = validateRepositoryIdentifier(observation.fullName);
  const url = new URL(observation.htmlUrl);
  const expectedPath = "/" + fullName.toLowerCase();
  const actualPath = url.pathname.replace(/\/+$/, "").toLowerCase();

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    actualPath !== expectedPath
  ) {
    throw new Error("URL canónica GitHub inválida.");
  }

  if (
    observation.description !== null &&
    observation.description !== undefined &&
    (typeof observation.description !== "string" || observation.description.length > 500)
  ) {
    throw new Error("Descripción GitHub inválida.");
  }

  if (
    observation.language !== null &&
    observation.language !== undefined &&
    (typeof observation.language !== "string" || observation.language.length > 80)
  ) {
    throw new Error("Lenguaje GitHub inválido.");
  }

  assertSafeNonNegativeInteger(observation.stars, "stars");
  assertSafeNonNegativeInteger(observation.forks, "forks");
  assertSafeNonNegativeInteger(
    observation.openIssuesAndPullRequests,
    "openIssuesAndPullRequests",
  );

  if (
    observation.contributorCount !== null &&
    observation.contributorCount !== undefined
  ) {
    assertSafeNonNegativeInteger(observation.contributorCount, "contributorCount");
  }

  const updatedAt = observation.updatedAt === null || observation.updatedAt === undefined
    ? null
    : parseIso(observation.updatedAt, "updatedAt");

  if (updatedAt !== null && updatedAt !== observation.updatedAt) {
    throw new Error("updatedAt debe estar normalizado en UTC ISO-8601.");
  }

  return {
    ...observation,
    fullName,
    updatedAt,
  };
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
  runKind,
  executionId,
  startedAt,
  finishedAt,
}) {
  if (!Array.isArray(observations) || observations.length === 0) {
    throw new Error("Se requiere al menos una observación para persistir.");
  }

  if (!["scheduled", "manual"].includes(runKind)) {
    throw new Error("runKind inválido.");
  }

  const normalizedExecutionId = validateExecutionId(executionId);
  const normalizedStartedAt = parseIso(startedAt, "startedAt");
  const normalizedFinishedAt = parseIso(finishedAt, "finishedAt");
  if (normalizedFinishedAt < normalizedStartedAt) {
    throw new Error("finishedAt no puede ser anterior a startedAt.");
  }

  if (!Number.isInteger(failures) || failures < 0) {
    throw new Error("Cantidad de fallos inválida.");
  }

  const normalizedObservedAt = parseIso(observedAt, "observedAt");
  if (normalizedObservedAt !== floorToSnapshotBucket(normalizedObservedAt)) {
    throw new Error("observedAt debe coincidir exactamente con un bucket UTC de 6h.");
  }

  const normalizedObservations = observations.map(validateSnapshotObservation);
  const itemIds = new Set();
  for (const observation of normalizedObservations) {
    const itemId = "github-" + observation.githubId;
    if (itemIds.has(itemId)) {
      throw new Error("Observaciones GitHub duplicadas para el mismo item.");
    }
    itemIds.add(itemId);
  }

  const runId =
    "github-snapshot:" + normalizedObservedAt + ":" + normalizedExecutionId;
  const status = failures === 0 ? "succeeded" : "partial";
  const totalSeen = normalizedObservations.length + failures;

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
      params: [runId, GITHUB_SOURCE_ID, runKind, normalizedStartedAt],
    },
  ];

  for (const observation of normalizedObservations) {
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
      normalizedFinishedAt,
      totalSeen,
      normalizedObservations.length,
      failures,
      failures > 0 ? "upstream_partial_failure" : null,
      runId,
    ],
  });

  return { batch, runId, status };
}
