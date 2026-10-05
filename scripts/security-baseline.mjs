import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? walk(path) : [path];
  });
}

function fail(message) {
  failures.push(message);
}

const applicationFiles = walk(join(root, "src")).filter((path) => /\.(?:js|jsx|ts|tsx)$/.test(path));
const scriptFiles = walk(join(root, "scripts"))
  .filter((path) => /\.(?:js|mjs|cjs|ts)$/.test(path))
  .filter((path) => !path.endsWith("security-baseline.mjs"));
const rootConfigFiles = [
  "next.config.ts",
  "vite.config.ts",
  "cloudflare.config.ts",
  "postcss.config.mjs",
]
  .map((path) => join(root, path))
  .filter(existsSync);

const codeFiles = [...applicationFiles, ...scriptFiles, ...rootConfigFiles];
const forbidden = [
  ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\b/],
  ["eval()", /\beval\s*\(/],
  ["new Function()", /\bnew\s+Function\s*\(/],
  ["document.write()", /\bdocument\.write\s*\(/],
];

for (const file of codeFiles) {
  const content = readFileSync(file, "utf8");
  const display = relative(root, file);

  for (const [label, pattern] of forbidden) {
    if (pattern.test(content)) {
      fail(display + ": uso prohibido de " + label);
    }
  }

  if (/["']use client["'];/.test(content) && /process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)/.test(content)) {
    fail(display + ": secreto/variable server-side referenciada desde un componente cliente");
  }

  if (/http:\/\//i.test(content)) {
    fail(display + ": URL HTTP no cifrada en código del proyecto");
  }

  for (const match of content.matchAll(/target=["']_blank["']/g)) {
    const context = content.slice(match.index, match.index + 240);
    if (!/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/.test(context)) {
      fail(display + ': target=_blank sin rel="noopener noreferrer"');
    }
  }
}

const workflowDir = join(root, ".github", "workflows");
for (const file of walk(workflowDir).filter((path) => /\.ya?ml$/.test(path))) {
  const content = readFileSync(file, "utf8");
  const display = relative(root, file);

  for (const match of content.matchAll(/^\s*uses:\s*([^\s#]+).*$/gm)) {
    if (!/@[0-9a-f]{40}$/i.test(match[1])) {
      fail(display + ": action no fijada a un SHA inmutable: " + match[1]);
    }
  }

  if (/\bpull_request_target\s*:/.test(content)) {
    fail(display + ": pull_request_target está prohibido por defecto");
  }

  if (/\b(?:pnpm\s+dlx|npx)\b/.test(content)) {
    fail(display + ": ejecución de paquete fuera del lockfile detectada");
  }

  if (/permissions:\s*write-all/.test(content)) {
    fail(display + ": permissions: write-all está prohibido");
  }
}

const snapshotWorkflowPath = join(root, ".github", "workflows", "github-snapshots.yml");
if (existsSync(snapshotWorkflowPath)) {
  const snapshotWorkflow = readFileSync(snapshotWorkflowPath, "utf8");
  const beforeSteps = snapshotWorkflow.split(/\n\s+steps:/, 1)[0];

  for (const secretName of [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_D1_DATABASE_ID",
    "CLOUDFLARE_D1_API_TOKEN",
  ]) {
    if (beforeSteps.includes(secretName)) {
      fail(".github/workflows/github-snapshots.yml: " + secretName + " expuesto a nivel job");
    }
  }

  if (!snapshotWorkflow.includes("Reject D1 persistence outside main")) {
    fail(".github/workflows/github-snapshots.yml: falta guard explícito de persistencia");
  }

  if (!snapshotWorkflow.includes("github.ref == 'refs/heads/main'")) {
    fail(".github/workflows/github-snapshots.yml: persistencia D1 no está ligada explícitamente a main");
  }

  if (!snapshotWorkflow.includes("node scripts/github-snapshot.mjs --manual --persist")) {
    fail(".github/workflows/github-snapshots.yml: persistencia manual no conserva run_kind=manual");
  }
}

const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{82,255})\b/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Bearer token literal", /\bBearer\s+[A-Za-z0-9._~-]{24,}\b/],
];

const textLikeFile = /\.(?:c?js|mjs|jsx|ts|tsx|json|ya?ml|md|sql|css|html|txt|toml|ini|conf|properties)$/i;

for (const path of tracked) {
  if (/^(?:.*\/)?\.env(?:\..+)?$/.test(path) && !path.endsWith(".env.example")) {
    fail(path + ": archivo de entorno real versionado");
  }
  if (/\.(?:pem|key|p12|pfx)$/i.test(path)) {
    fail(path + ": material criptográfico privado potencialmente versionado");
  }
  if (/(?:^|\/)\.dev\.vars(?:\..+)?$/.test(path)) {
    fail(path + ": archivo .dev.vars real versionado");
  }

  if (textLikeFile.test(path)) {
    const absolutePath = join(root, path);
    const stat = statSync(absolutePath);
    if (stat.size <= 2_000_000) {
      const content = readFileSync(absolutePath, "utf8");
      for (const [label, pattern] of secretPatterns) {
        if (pattern.test(content)) {
          fail(path + ": posible secreto de alta confianza detectado (" + label + ")");
        }
      }

      if (
        /_authToken\s*=\s*(?!\$\{|\$[A-Z_])[A-Za-z0-9._~-]{16,}/.test(content)
      ) {
        fail(path + ": token npm literal detectado");
      }
    }
  }
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (packageJson.packageManager !== "pnpm@11.28.0") {
  fail("package.json: packageManager debe permanecer fijado a pnpm@11.28.0");
}

for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  if (/\b(?:npm|npx|pnpm\s+dlx)\b/.test(String(command))) {
    fail("package.json: script " + name + " usa un ejecutor no permitido");
  }
}

const exactSemver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
for (const section of ["dependencies", "devDependencies"]) {
  for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
    if (!exactSemver.test(String(version))) {
      fail(
        "package.json: " +
          section +
          "." +
          name +
          " debe usar una versión exacta, no " +
          JSON.stringify(version),
      );
    }
  }
}

if (!existsSync(join(root, "pnpm-lock.yaml"))) {
  fail("pnpm-lock.yaml: lockfile obligatorio ausente");
}

const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
for (const required of [
  "minimumReleaseAge: 1440",
  "blockExoticSubdeps: true",
  "saveExact: true",
  "level: moderate",
]) {
  if (!workspace.includes(required)) {
    fail("pnpm-workspace.yaml: falta política " + required);
  }
}

const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
for (const header of [
  "Content-Security-Policy",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
]) {
  if (!nextConfig.includes(header)) {
    fail("next.config.ts: falta header de seguridad " + header);
  }
}

for (const policy of [
  "connect-src 'self'",
  "geolocation=()",
  "object-src 'none'",
  "frame-ancestors 'none'",
]) {
  if (!nextConfig.includes(policy)) {
    fail("next.config.ts: falta política restrictiva " + policy);
  }
}

if (failures.length > 0) {
  console.error("Security baseline: FAIL");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log(
  "Security baseline: PASS (" +
    codeFiles.length +
    " archivos de código/config revisados; " +
    applicationFiles.length +
    " archivos de aplicación)",
);
