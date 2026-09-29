import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrationsDir = join(process.cwd(), "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

if (migrations.length === 0) {
  throw new Error("No se encontraron migraciones SQL versionadas.");
}

const db = new DatabaseSync(":memory:");

try {
  db.exec("PRAGMA foreign_keys = ON;");

  for (const migration of migrations) {
    const sql = readFileSync(join(migrationsDir, migration), "utf8");
    db.exec(sql);
  }

  const foreignKeyViolations = db.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyViolations.length > 0) {
    throw new Error(
      "El schema contiene violaciones de foreign keys: " +
        JSON.stringify(foreignKeyViolations),
    );
  }

  const integrity = db.prepare("PRAGMA integrity_check").all();
  const integrityOk =
    integrity.length === 1 &&
    Object.values(integrity[0]).some((value) => value === "ok");

  if (!integrityOk) {
    throw new Error("PRAGMA integrity_check no devolvió ok.");
  }

  const tableRows = db
    .prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all();

  console.log(
    "[d1-schema] PASS",
    JSON.stringify({
      migrations,
      tables: tableRows.map((row) => row.name),
    }),
  );
} finally {
  db.close();
}
