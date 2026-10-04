import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildSnapshotPersistenceBatch,
  repositoryApiPath,
  resolveSnapshotRunOptions,
  validateRepositoryConfig,
} from "./lib/github-snapshot-core.mjs";
import { cloudflareD1Credentials } from "./lib/cloudflare-d1-config.mjs";

const GITHUB_API_ORIGIN = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN?.trim();

  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "dalil-snapshot-collector",
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
}

async function parseBoundedJson(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Respuesta JSON esperada.");
  }

  const advertisedLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_RESPONSE_BYTES) {
    throw new Error("Respuesta externa demasiado grande.");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("Respuesta externa demasiado grande.");
  }

  return JSON.parse(new TextDecoder().decode(buffer));
}

function parseLastPage(linkHeader) {
  if (!linkHeader) return null;

  for (const segment of linkHeader.split(",")) {
    if (!segment.includes('rel="last"')) continue;
    const match = segment.match(/<([^>]+)>/);
    if (!match) return null;

    const page = Number(new URL(match[1]).searchParams.get("page"));
    if (Number.isSafeInteger(page) && page >= 0) return page;
  }

  return null;
}

async function fetchContributorCount(repository) {
  const response = await fetch(
    GITHUB_API_ORIGIN + repositoryApiPath(repository) + "/contributors?per_page=1&anon=false",
    {
      headers: githubHeaders(),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (response.status === 202) return null;
  if (!response.ok) return null;

  const payload = await parseBoundedJson(response);
  if (!Array.isArray(payload) || payload.length === 0) return 0;

  return parseLastPage(response.headers.get("link")) ?? 1;
}

function assertRepositoryPayload(payload, expectedRepository) {
  let htmlUrl;

  try {
    htmlUrl = new URL(payload?.html_url);
  } catch {
    throw new Error("GitHub devolvió una URL de repositorio inválida.");
  }

  const expectedPath = "/" + expectedRepository.toLowerCase();
  const actualPath = htmlUrl.pathname.replace(/\/+$/, "").toLowerCase();

  if (
    !payload ||
    !Number.isSafeInteger(payload.id) ||
    payload.id <= 0 ||
    typeof payload.full_name !== "string" ||
    payload.full_name.toLowerCase() !== expectedRepository.toLowerCase() ||
    payload.private !== false ||
    payload.visibility !== "public" ||
    htmlUrl.protocol !== "https:" ||
    htmlUrl.hostname !== "github.com" ||
    htmlUrl.username ||
    htmlUrl.password ||
    htmlUrl.port ||
    htmlUrl.search ||
    htmlUrl.hash ||
    actualPath !== expectedPath ||
    !Number.isSafeInteger(payload.stargazers_count) ||
    payload.stargazers_count < 0 ||
    !Number.isSafeInteger(payload.forks_count) ||
    payload.forks_count < 0 ||
    !Number.isSafeInteger(payload.open_issues_count) ||
    payload.open_issues_count < 0 ||
    typeof payload.updated_at !== "string"
  ) {
    throw new Error("GitHub devolvió un payload de repositorio inválido.");
  }
}

async function fetchRepositoryObservation(repository) {
  const [repoResponse, contributorCount] = await Promise.all([
    fetch(GITHUB_API_ORIGIN + repositoryApiPath(repository), {
      headers: githubHeaders(),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    fetchContributorCount(repository),
  ]);

  if (!repoResponse.ok) {
    throw new Error("GitHub repository respondió " + repoResponse.status + ".");
  }

  const payload = await parseBoundedJson(repoResponse);
  assertRepositoryPayload(payload, repository);

  return {
    githubId: payload.id,
    fullName: payload.full_name,
    description: typeof payload.description === "string" ? payload.description.slice(0, 500) : null,
    htmlUrl: payload.html_url,
    stars: payload.stargazers_count,
    forks: payload.forks_count,
    openIssuesAndPullRequests: payload.open_issues_count,
    contributorCount,
    language: typeof payload.language === "string" ? payload.language.slice(0, 80) : null,
    updatedAt: new Date(payload.updated_at).toISOString(),
  };
}

async function persistToD1(batch) {
  const { accountId, databaseId, token } = cloudflareD1Credentials();

  const response = await fetch(
    CLOUDFLARE_API_ORIGIN +
      "/client/v4/accounts/" +
      encodeURIComponent(accountId) +
      "/d1/database/" +
      encodeURIComponent(databaseId) +
      "/query",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ batch }),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  const payload = await parseBoundedJson(response);
  const results = Array.isArray(payload?.result) ? payload.result : [];
  const allSucceeded =
    response.ok &&
    payload?.success === true &&
    results.length === batch.length &&
    results.every((result) => result?.success === true);

  if (!allSucceeded) {
    const codes = Array.isArray(payload?.errors)
      ? payload.errors.map((error) => error?.code).filter(Boolean)
      : [];
    throw new Error("D1 rechazó el batch. códigos=" + JSON.stringify(codes));
  }

  return results.reduce(
    (totals, result) => ({
      rowsRead: totals.rowsRead + Number(result?.meta?.rows_read ?? 0),
      rowsWritten: totals.rowsWritten + Number(result?.meta?.rows_written ?? 0),
    }),
    { rowsRead: 0, rowsWritten: 0 },
  );
}

const configPath = resolve(process.cwd(), "config", "github-repositories.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const repositories = validateRepositoryConfig(config);
const runOptions = resolveSnapshotRunOptions(process.argv.slice(2));

const settled = await Promise.allSettled(
  repositories.map((repository) => fetchRepositoryObservation(repository)),
);

const observations = settled.flatMap((result) =>
  result.status === "fulfilled" ? [result.value] : [],
);
const failures = settled.filter((result) => result.status === "rejected").length;

if (observations.length === 0) {
  throw new Error("No se obtuvo ninguna observación GitHub.");
}

const persistence = buildSnapshotPersistenceBatch({
  observedAt: runOptions.observedAt,
  observations,
  failures,
  runKind: runOptions.runKind,
});

const summary = {
  observedAt: runOptions.observedAt,
  runId: persistence.runId,
  status: persistence.status,
  repositoriesRequested: repositories.length,
  repositoriesObserved: observations.length,
  failures,
  metrics: observations.map((observation) => ({
    repository: observation.fullName,
    stars: observation.stars,
    forks: observation.forks,
    openIssuesAndPullRequests: observation.openIssuesAndPullRequests,
    contributorCount: observation.contributorCount,
  })),
};

if (runOptions.persist) {
  const d1 = await persistToD1(persistence.batch);
  console.log("[github-snapshot] PERSISTED", JSON.stringify({ ...summary, d1 }));
} else {
  console.log("[github-snapshot] DRY_RUN", JSON.stringify(summary));
}
