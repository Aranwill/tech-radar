import { existsSync } from "node:fs";

const ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/i;
const DATABASE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function loadLocalEnvironment(path = ".env.local") {
  if (existsSync(path)) {
    process.loadEnvFile(path);
    return true;
  }

  return false;
}

export function requiredEnvironment(name, environment = process.env) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error("Falta variable requerida: " + name);
  }
  return value;
}

export function validateCloudflareD1Identifiers(accountId, databaseId) {
  if (!ACCOUNT_ID_PATTERN.test(accountId)) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID inválido.");
  }

  if (!DATABASE_ID_PATTERN.test(databaseId)) {
    throw new Error("CLOUDFLARE_D1_DATABASE_ID inválido.");
  }
}

export function cloudflareD1Credentials({
  environment = process.env,
  loadLocal = true,
  localPath = ".env.local",
} = {}) {
  if (loadLocal) {
    loadLocalEnvironment(localPath);
  }

  const accountId = requiredEnvironment("CLOUDFLARE_ACCOUNT_ID", environment);
  const databaseId = requiredEnvironment("CLOUDFLARE_D1_DATABASE_ID", environment);
  const token = requiredEnvironment("CLOUDFLARE_D1_API_TOKEN", environment);

  validateCloudflareD1Identifiers(accountId, databaseId);

  return Object.freeze({
    accountId,
    databaseId,
    token,
  });
}
