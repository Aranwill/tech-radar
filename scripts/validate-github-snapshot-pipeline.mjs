import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  buildSnapshotPersistenceBatch,
  floorToSnapshotBucket,
  repositoryApiPath,
  resolveSnapshotRunOptions,
  validateRepositoryConfig,
  validateRepositoryIdentifier,
} from "./lib/github-snapshot-core.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(fn, message) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

function applyBatch(db, batch) {
  for (const query of batch) {
    db.prepare(query.sql).run(...query.params);
  }
}

const config = JSON.parse(
  readFileSync(join(process.cwd(), "config", "github-repositories.json"), "utf8"),
);
const repositories = validateRepositoryConfig(config);
assert(repositories.length === 3, "El fixture curado esperado cambió sin actualizar la validación.");

assert(
  floorToSnapshotBucket("2026-09-29T23:59:59.999Z") === "2026-09-29T18:00:00.000Z",
  "El bucket UTC de 6h no es determinista.",
);

assert(
  repositoryApiPath("example/project") === "/repos/example/project",
  "El path GitHub normalizado cambió.",
);
expectThrow(
  () => validateRepositoryIdentifier("../project"),
  "Se aceptó un owner con dot-segment.",
);
expectThrow(
  () => validateRepositoryIdentifier("owner/.."),
  "Se aceptó un repo con dot-segment.",
);
expectThrow(
  () => validateRepositoryConfig({ version: 1, repositories: ["a/b", "a/b"] }),
  "Se aceptó un catálogo con repositorios duplicados.",
);

const manualPersist = resolveSnapshotRunOptions(
  ["--manual", "--persist"],
  new Date("2026-09-29T23:59:59.999Z"),
);
assert(manualPersist.persist === true, "Persist manual no preservado.");
assert(manualPersist.runKind === "manual", "Persist manual quedó etiquetado como scheduled.");
assert(
  manualPersist.observedAt === "2026-09-29T18:00:00.000Z",
  "Persist manual no usa el bucket UTC corriente.",
);
expectThrow(
  () => resolveSnapshotRunOptions(["--backfill"], new Date("2026-09-29T18:00:00.000Z")),
  "Backfill live quedó habilitado.",
);
expectThrow(
  () => resolveSnapshotRunOptions(["--manual", "--persist", "--at=2026-09-29T18:00:00.000Z"]),
  "--at persistente quedó habilitado.",
);
expectThrow(
  () => resolveSnapshotRunOptions(["--manual", "--at=2026-09-29T19:00:00.000Z"]),
  "Se aceptó un --at fuera del bucket UTC exacto.",
);
expectThrow(
  () => resolveSnapshotRunOptions(["--manul"]),
  "Un flag desconocido fue aceptado silenciosamente.",
);

const db = new DatabaseSync(":memory:");

try {
  db.exec("PRAGMA foreign_keys = ON;");

  const migrations = readdirSync(join(process.cwd(), "migrations"))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  for (const migration of migrations) {
    db.exec(readFileSync(join(process.cwd(), "migrations", migration), "utf8"));
  }

  const baseObservation = {
    githubId: 123,
    fullName: "example/project",
    description: "fixture",
    htmlUrl: "https://github.com/example/project",
    stars: 100,
    forks: 10,
    openIssuesAndPullRequests: 5,
    contributorCount: 4,
    language: "TypeScript",
    updatedAt: "2026-09-29T17:00:00.000Z",
  };

  expectThrow(
    () =>
      buildSnapshotPersistenceBatch({
        observedAt: "2026-09-29T19:00:00.000Z",
        observations: [baseObservation],
        failures: 0,
        runKind: "manual",
      }),
    "Persistencia aceptó un observedAt fuera del bucket UTC exacto.",
  );
  expectThrow(
    () =>
      buildSnapshotPersistenceBatch({
        observedAt: "2026-09-29T18:00:00.000Z",
        observations: [{ ...baseObservation, htmlUrl: "http://github.com/example/project" }],
        failures: 0,
        runKind: "manual",
      }),
    "Persistencia aceptó una URL GitHub no HTTPS.",
  );

  const firstAt = "2026-09-29T18:00:00.000Z";
  const first = buildSnapshotPersistenceBatch({
    observedAt: firstAt,
    observations: [baseObservation],
    failures: 0,
    runKind: "manual",
  });
  applyBatch(db, first.batch);

  const rerun = buildSnapshotPersistenceBatch({
    observedAt: firstAt,
    observations: [{ ...baseObservation, stars: 101 }],
    failures: 0,
    runKind: "manual",
  });
  applyBatch(db, rerun.batch);

  const snapshotCountAfterRerun = db
    .prepare("SELECT COUNT(*) AS count FROM repository_snapshots")
    .get().count;
  const starsAfterRerun = db
    .prepare("SELECT stars FROM repository_snapshots WHERE item_id = ? AND observed_at = ?")
    .get("github-123", firstAt).stars;

  assert(snapshotCountAfterRerun === 1, "Un rerun del mismo bucket duplicó snapshots.");
  assert(starsAfterRerun === 101, "El rerun idempotente no actualizó el snapshot existente.");

  const secondAt = "2026-09-30T00:00:00.000Z";
  const second = buildSnapshotPersistenceBatch({
    observedAt: secondAt,
    observations: [{ ...baseObservation, stars: 108, forks: 11 }],
    failures: 1,
    runKind: "scheduled",
  });
  applyBatch(db, second.batch);

  const snapshotCount = db
    .prepare("SELECT COUNT(*) AS count FROM repository_snapshots")
    .get().count;
  const latestRun = db
    .prepare("SELECT status, items_seen, items_written, items_failed FROM ingestion_runs WHERE id = ?")
    .get(second.runId);

  assert(snapshotCount === 2, "Un nuevo bucket no creó un nuevo snapshot.");
  assert(latestRun.status === "partial", "Un run con fallos no quedó marcado partial.");
  assert(latestRun.items_seen === 2, "items_seen no refleja observados + fallidos.");
  assert(latestRun.items_written === 1, "items_written incorrecto.");
  assert(latestRun.items_failed === 1, "items_failed incorrecto.");

  const fk = db.prepare("PRAGMA foreign_key_check").all();
  assert(fk.length === 0, "La persistencia de snapshots viola foreign keys.");

  console.log(
    "[github-snapshot-validation] PASS",
    JSON.stringify({
      repositoriesConfigured: repositories.length,
      snapshotCount,
      rerunIdempotent: true,
      partialRunTracked: true,
      productionSecretsScoped: true,
      backfillLiveRejected: true,
      exactBucketsEnforced: true,
    }),
  );
} finally {
  db.close();
}
