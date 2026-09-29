const HOUR_MS = 60 * 60 * 1000;

export const HISTORY_WINDOWS = Object.freeze([
  Object.freeze({ key: "24h", hours: 24 }),
  Object.freeze({ key: "7d", hours: 24 * 7 }),
  Object.freeze({ key: "30d", hours: 24 * 30 }),
]);

function parseIso(value, fieldName) {
  if (typeof value !== "string") {
    throw new Error(fieldName + " debe ser un timestamp ISO.");
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(fieldName + " inválido.");
  }

  return { timestamp, iso: new Date(timestamp).toISOString() };
}

function assertNonNegativeInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(fieldName + " debe ser un entero no negativo.");
  }
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot inválido.");
  }

  if (typeof snapshot.itemId !== "string" || snapshot.itemId.length === 0) {
    throw new Error("itemId inválido.");
  }

  const observedAt = parseIso(snapshot.observedAt, "observedAt");

  assertNonNegativeInteger(snapshot.stars, "stars");
  assertNonNegativeInteger(snapshot.forks, "forks");
  assertNonNegativeInteger(
    snapshot.openIssuesAndPullRequests,
    "openIssuesAndPullRequests",
  );

  if (
    snapshot.contributorCount !== null &&
    snapshot.contributorCount !== undefined
  ) {
    assertNonNegativeInteger(snapshot.contributorCount, "contributorCount");
  }

  return {
    itemId: snapshot.itemId,
    observedAt: observedAt.iso,
    observedAtMs: observedAt.timestamp,
    stars: snapshot.stars,
    forks: snapshot.forks,
    openIssuesAndPullRequests: snapshot.openIssuesAndPullRequests,
    contributorCount: snapshot.contributorCount ?? null,
  };
}

function metricDelta(latest, baseline) {
  return {
    from: baseline,
    to: latest,
    delta: latest - baseline,
  };
}

function nullableMetricDelta(latest, baseline) {
  if (latest === null || baseline === null) {
    return null;
  }

  return metricDelta(latest, baseline);
}

export function buildHistoryTargets(latestObservedAt) {
  const latest = parseIso(latestObservedAt, "latestObservedAt");

  return Object.fromEntries(
    HISTORY_WINDOWS.map(({ key, hours }) => {
      const targetMs = latest.timestamp - hours * HOUR_MS;
      return [
        key,
        {
          hours,
          targetAt: new Date(targetMs).toISOString(),
        },
      ];
    }),
  );
}

export function deriveRepositoryHistory(inputSnapshots) {
  if (!Array.isArray(inputSnapshots) || inputSnapshots.length === 0) {
    throw new Error("Se requiere al menos un snapshot.");
  }

  const snapshots = inputSnapshots
    .map(normalizeSnapshot)
    .sort((a, b) => a.observedAtMs - b.observedAtMs);

  const itemIds = new Set(snapshots.map((snapshot) => snapshot.itemId));
  if (itemIds.size !== 1) {
    throw new Error("Todos los snapshots deben pertenecer al mismo item.");
  }

  const seenTimestamps = new Set();
  for (const snapshot of snapshots) {
    if (seenTimestamps.has(snapshot.observedAt)) {
      throw new Error("Snapshots duplicados para el mismo observedAt.");
    }
    seenTimestamps.add(snapshot.observedAt);
  }

  const latest = snapshots.at(-1);
  const oldest = snapshots[0];
  const targets = buildHistoryTargets(latest.observedAt);
  const byObservedAt = new Map(
    snapshots.map((snapshot) => [snapshot.observedAt, snapshot]),
  );

  const windows = Object.fromEntries(
    HISTORY_WINDOWS.map(({ key, hours }) => {
      const target = targets[key];
      const baseline = byObservedAt.get(target.targetAt);

      if (!baseline) {
        const targetMs = Date.parse(target.targetAt);
        const reason =
          oldest.observedAtMs > targetMs
            ? "insufficient_history"
            : "baseline_gap";

        return [
          key,
          {
            state: "pending",
            hours,
            targetAt: target.targetAt,
            reason,
          },
        ];
      }

      return [
        key,
        {
          state: "ready",
          hours,
          targetAt: target.targetAt,
          baselineAt: baseline.observedAt,
          latestAt: latest.observedAt,
          stars: metricDelta(latest.stars, baseline.stars),
          forks: metricDelta(latest.forks, baseline.forks),
          openIssuesAndPullRequests: metricDelta(
            latest.openIssuesAndPullRequests,
            baseline.openIssuesAndPullRequests,
          ),
          contributorCount: nullableMetricDelta(
            latest.contributorCount,
            baseline.contributorCount,
          ),
        },
      ];
    }),
  );

  return {
    itemId: latest.itemId,
    latestAt: latest.observedAt,
    oldestAt: oldest.observedAt,
    observations: snapshots.length,
    windows,
  };
}

export function requiredHistoryTimestamps(latestObservedAt) {
  const targets = buildHistoryTargets(latestObservedAt);
  return [
    new Date(latestObservedAt).toISOString(),
    ...HISTORY_WINDOWS.map(({ key }) => targets[key].targetAt),
  ];
}
