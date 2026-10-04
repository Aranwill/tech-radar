import { cloudflareD1Credentials } from "./lib/cloudflare-d1-config.mjs";

const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;

const REQUIRED_TABLES = Object.freeze([
  "sources",
  "ingestion_runs",
  "content_items",
  "repository_snapshots",
  "stories",
  "story_items",
  "claims",
  "evidence_records",
  "claim_evidence",
  "country_metrics_daily",
]);

async function parseBoundedJson(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Cloudflare no devolvió JSON.");
  }

  const advertisedLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_RESPONSE_BYTES) {
    throw new Error("Respuesta D1 demasiado grande.");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("Respuesta D1 demasiado grande.");
  }

  return JSON.parse(new TextDecoder().decode(buffer));
}

function cloudflareErrorCodes(payload) {
  if (!Array.isArray(payload?.errors)) return [];
  return payload.errors
    .map((error) => error?.code)
    .filter((code) => Number.isInteger(code));
}

async function queryD1({ accountId, databaseId, token, body }) {
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
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  const payload = await parseBoundedJson(response);
  const results = Array.isArray(payload?.result) ? payload.result : [];

  if (
    !response.ok ||
    payload?.success !== true ||
    results.length === 0 ||
    results.some((result) => result?.success !== true)
  ) {
    throw new Error(
      "Consulta D1 rechazada. códigos=" +
        JSON.stringify(cloudflareErrorCodes(payload)),
    );
  }

  return results;
}

function rowsFromSingleQuery(results) {
  if (results.length !== 1 || !Array.isArray(results[0]?.results)) {
    throw new Error("Contrato de respuesta D1 inesperado.");
  }

  return results[0].results;
}

const { accountId, databaseId, token } = cloudflareD1Credentials();

const tableRows = rowsFromSingleQuery(
  await queryD1({
    accountId,
    databaseId,
    token,
    body: {
      sql: "SELECT name FROM sqlite_master WHERE type = ? ORDER BY name",
      params: ["table"],
    },
  }),
);

const tableNames = new Set(
  tableRows
    .map((row) => row?.name)
    .filter((name) => typeof name === "string"),
);

const missingTables = REQUIRED_TABLES.filter((name) => !tableNames.has(name));
if (missingTables.length > 0) {
  throw new Error(
    "Schema D1 incompleto. Faltan tablas: " + missingTables.join(", "),
  );
}

const countResults = await queryD1({
  accountId,
  databaseId,
  token,
  body: {
    batch: [
      { sql: "SELECT COUNT(*) AS count FROM sources", params: [] },
      { sql: "SELECT COUNT(*) AS count FROM content_items", params: [] },
      { sql: "SELECT COUNT(*) AS count FROM repository_snapshots", params: [] },
      { sql: "SELECT COUNT(*) AS count FROM ingestion_runs", params: [] },
    ],
  },
});

if (countResults.length !== 4) {
  throw new Error("D1 no devolvió los cuatro conteos esperados.");
}

const countNames = [
  "sources",
  "contentItems",
  "repositorySnapshots",
  "ingestionRuns",
];

const counts = Object.fromEntries(
  countResults.map((result, index) => {
    const count = result?.results?.[0]?.count;
    if (!Number.isInteger(count) || count < 0) {
      throw new Error("Conteo D1 inválido para " + countNames[index] + ".");
    }
    return [countNames[index], count];
  }),
);

const migrationRows = tableNames.has("d1_migrations")
  ? rowsFromSingleQuery(
      await queryD1({
        accountId,
        databaseId,
        token,
        body: {
          sql: "SELECT name FROM d1_migrations ORDER BY id",
          params: [],
        },
      }),
    )
  : [];

const migrations = migrationRows
  .map((row) => row?.name)
  .filter((name) => typeof name === "string");

console.log(
  "[d1-remote-verification] PASS",
  JSON.stringify({
    schemaTables: REQUIRED_TABLES.length,
    migrations,
    counts,
  }),
);
