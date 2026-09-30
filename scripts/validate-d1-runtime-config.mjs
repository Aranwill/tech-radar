import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cloudflareD1Credentials,
  loadLocalEnvironment,
  requiredEnvironment,
  validateCloudflareD1Identifiers,
} from "./lib/cloudflare-d1-config.mjs";

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

const validAccountId = "0123456789abcdef0123456789abcdef";
const validDatabaseId = "123e4567-e89b-42d3-a456-426614174000";

validateCloudflareD1Identifiers(validAccountId, validDatabaseId);

expectThrow(
  () => validateCloudflareD1Identifiers("account-name", validDatabaseId),
  "Account ID permisivo aceptado por error.",
);
expectThrow(
  () => validateCloudflareD1Identifiers(validAccountId, "1234-not-a-uuid"),
  "Database ID permisivo aceptado por error.",
);
expectThrow(
  () => requiredEnvironment("MISSING", {}),
  "Una variable requerida ausente no produjo error.",
);

const direct = cloudflareD1Credentials({
  loadLocal: false,
  environment: {
    CLOUDFLARE_ACCOUNT_ID: validAccountId,
    CLOUDFLARE_D1_DATABASE_ID: validDatabaseId,
    CLOUDFLARE_D1_API_TOKEN: "test-token",
  },
});

assert(direct.accountId === validAccountId, "Account ID no preservado.");
assert(direct.databaseId === validDatabaseId, "Database ID no preservado.");
assert(direct.token === "test-token", "Token no preservado.");

const tempDir = mkdtempSync(join(tmpdir(), "dalil-d1-config-"));
const envPath = join(tempDir, ".env.local");
const names = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_D1_DATABASE_ID",
  "CLOUDFLARE_D1_API_TOKEN",
];
const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));

try {
  for (const name of names) delete process.env[name];

  writeFileSync(
    envPath,
    [
      "CLOUDFLARE_ACCOUNT_ID=" + validAccountId,
      "CLOUDFLARE_D1_DATABASE_ID=" + validDatabaseId,
      "CLOUDFLARE_D1_API_TOKEN=test-local-token",
      "",
    ].join("\n"),
    "utf8",
  );

  assert(loadLocalEnvironment(envPath) === true, ".env.local de prueba no fue cargado.");
  const loaded = cloudflareD1Credentials({ loadLocal: false });

  assert(loaded.accountId === validAccountId, "Account ID local no cargado.");
  assert(loaded.databaseId === validDatabaseId, "Database ID local no cargado.");
  assert(loaded.token === "test-local-token", "Token local no cargado.");
} finally {
  for (const name of names) {
    const value = previous[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(
  "[d1-runtime-config-validation] PASS",
  JSON.stringify({
    strictIdentifiers: true,
    missingValuesRejected: true,
    localEnvironmentLoad: true,
  }),
);
