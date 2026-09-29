import {
  buildHistoryTargets,
  deriveRepositoryHistory,
  requiredHistoryTimestamps,
} from "./lib/github-history-core.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const latestAt = "2026-09-30T00:00:00.000Z";
const targets = buildHistoryTargets(latestAt);

assert(targets["24h"].targetAt === "2026-09-29T00:00:00.000Z", "Target 24h incorrecto.");
assert(targets["7d"].targetAt === "2026-09-23T00:00:00.000Z", "Target 7d incorrecto.");
assert(targets["30d"].targetAt === "2026-08-31T00:00:00.000Z", "Target 30d incorrecto.");

const fullHistory = deriveRepositoryHistory([
  {
    itemId: "github-123",
    observedAt: "2026-08-31T00:00:00.000Z",
    stars: 800,
    forks: 70,
    openIssuesAndPullRequests: 50,
    contributorCount: 20,
  },
  {
    itemId: "github-123",
    observedAt: "2026-09-23T00:00:00.000Z",
    stars: 940,
    forks: 78,
    openIssuesAndPullRequests: 47,
    contributorCount: 22,
  },
  {
    itemId: "github-123",
    observedAt: "2026-09-29T00:00:00.000Z",
    stars: 990,
    forks: 80,
    openIssuesAndPullRequests: 45,
    contributorCount: 23,
  },
  {
    itemId: "github-123",
    observedAt: latestAt,
    stars: 1000,
    forks: 81,
    openIssuesAndPullRequests: 44,
    contributorCount: 24,
  },
]);

assert(fullHistory.windows["24h"].state === "ready", "24h debe estar ready.");
assert(fullHistory.windows["24h"].stars.delta === 10, "Delta stars 24h incorrecto.");
assert(fullHistory.windows["7d"].stars.delta === 60, "Delta stars 7d incorrecto.");
assert(fullHistory.windows["30d"].stars.delta === 200, "Delta stars 30d incorrecto.");
assert(fullHistory.windows["7d"].forks.delta === 3, "Delta forks 7d incorrecto.");
assert(
  fullHistory.windows["30d"].openIssuesAndPullRequests.delta === -6,
  "Delta issues/PR 30d debe permitir disminuciones.",
);
assert(
  fullHistory.windows["30d"].contributorCount.delta === 4,
  "Delta contributors 30d incorrecto.",
);

const shortHistory = deriveRepositoryHistory([
  {
    itemId: "github-123",
    observedAt: "2026-09-29T00:00:00.000Z",
    stars: 990,
    forks: 80,
    openIssuesAndPullRequests: 45,
    contributorCount: 23,
  },
  {
    itemId: "github-123",
    observedAt: latestAt,
    stars: 1000,
    forks: 81,
    openIssuesAndPullRequests: 44,
    contributorCount: 24,
  },
]);

assert(shortHistory.windows["24h"].state === "ready", "24h debe existir en histórico corto.");
assert(
  shortHistory.windows["7d"].reason === "insufficient_history",
  "7d debe quedar pending por histórico insuficiente.",
);
assert(
  shortHistory.windows["30d"].reason === "insufficient_history",
  "30d debe quedar pending por histórico insuficiente.",
);

const gapHistory = deriveRepositoryHistory([
  {
    itemId: "github-123",
    observedAt: "2026-08-30T18:00:00.000Z",
    stars: 790,
    forks: 69,
    openIssuesAndPullRequests: 52,
    contributorCount: 19,
  },
  {
    itemId: "github-123",
    observedAt: "2026-09-29T00:00:00.000Z",
    stars: 990,
    forks: 80,
    openIssuesAndPullRequests: 45,
    contributorCount: null,
  },
  {
    itemId: "github-123",
    observedAt: latestAt,
    stars: 1000,
    forks: 81,
    openIssuesAndPullRequests: 44,
    contributorCount: 24,
  },
]);

assert(
  gapHistory.windows["7d"].reason === "baseline_gap",
  "Un baseline faltante dentro de un histórico suficiente debe quedar baseline_gap.",
);
assert(
  gapHistory.windows["30d"].reason === "baseline_gap",
  "30d faltante debe diferenciarse de histórico insuficiente.",
);
assert(
  gapHistory.windows["24h"].contributorCount === null,
  "No se debe inventar delta de contribuidores si falta un extremo.",
);

const timestamps = requiredHistoryTimestamps(latestAt);
assert(timestamps.length === 4, "Se esperaban latest + 3 baselines.");
assert(new Set(timestamps).size === 4, "Los timestamps requeridos deben ser únicos.");

let duplicateRejected = false;
try {
  deriveRepositoryHistory([
    {
      itemId: "github-123",
      observedAt: latestAt,
      stars: 1,
      forks: 1,
      openIssuesAndPullRequests: 1,
      contributorCount: 1,
    },
    {
      itemId: "github-123",
      observedAt: latestAt,
      stars: 2,
      forks: 1,
      openIssuesAndPullRequests: 1,
      contributorCount: 1,
    },
  ]);
} catch {
  duplicateRejected = true;
}
assert(duplicateRejected, "Los snapshots duplicados deben rechazarse.");

console.log(
  "[github-history-validation] PASS",
  JSON.stringify({
    readyWindows: ["24h", "7d", "30d"],
    pendingReasons: ["insufficient_history", "baseline_gap"],
    exactBaselines: true,
    signedDeltas: true,
    nullableContributorDelta: true,
  }),
);
