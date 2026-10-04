import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join, relative } from "node:path";

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

function sourceCodeFiles() {
  const src = walk(join(root, "src")).filter((path) => /\.(?:js|jsx|ts|tsx)$/.test(path));
  const scripts = walk(join(root, "scripts"))
    .filter((path) => /\.m?js$/.test(path))
    .filter((path) => basename(path) !== "security-baseline.mjs");

  return [
    ...src,
    ...scripts,
    join(root, "public", "sw.js"),
    join(root, "next.config.ts"),
    join(root, "vite.config.ts"),
    join(root, "cloudflare.config.ts"),
  ].filter(existsSync);
}

const forbiddenExecution = [
  ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\b/],
  ["eval()", /\beval\s*\(/],
  ["new Function()", /\bnew\s+Function\s*\(/],
  ["document.write()", /\bdocument\.write\s*\(/],
];

const codeFiles = sourceCodeFiles();
for (const file of codeFiles) {
  const content = readFileSync(file, "utf8");
  const display = relative(root, file);

  for (const [label, pattern] of forbiddenExecution) {
    if (pattern.test(content)) {
      fail(display + ": uso prohibido de " + label);
    }
  }

  if (
    /["']use client["'];/.test(content) &&
    /process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)/.test(content)
  ) {
    fail(display + ": secreto/variable server-side referenciada desde un componente cliente");
  }
}

for (const file of walk(join(root, "src")).filter((path) => /\.(?:js|jsx|ts|tsx)$/.test(path))) {
  const content = readFileSync(file, "utf8");
  if (/http:\/\//i.test(content)) {
    fail(relative(root, file) + ": URL HTTP no cifrada en código de aplicación");
  }
}

const githubClientPath = join(root, "src", "lib", "github", "client.ts");
if (existsSync(githubClientPath)) {
  const githubClient = readFileSync(githubClientPath, "utf8");
  if (/redirect:\s*["']error["']/.test(githubClient)) {
    fail("src/lib/github/client.ts: redirect:error no es portable al runtime Edge");
  }
  for (const required of [
    "private: z.literal(false)",
    'visibility: z.literal("public")',
  ]) {
    if (!githubClient.includes(required)) {
      fail("src/lib/github/client.ts: falta control GitHub público: " + required);
    }
  }
}

const svgFiles = [
  ...walk(join(root, "public")),
  ...walk(join(root, "src", "app")),
].filter((path) => /\.svg$/i.test(path));

const svgForbidden = [
  ["script", /<\s*script\b/i],
  ["foreignObject", /<\s*foreignObject\b/i],
  ["event handler", /\son[a-z]+\s*=/i],
  ["javascript URL", /javascript\s*:/i],
  ["external SVG href", /(?:href|xlink:href)\s*=\s*["']https?:/i],
];

for (const file of svgFiles) {
  const content = readFileSync(file, "utf8");
  for (const [label, pattern] of svgForbidden) {
    if (pattern.test(content)) {
      fail(relative(root, file) + ": SVG contiene " + label + " no permitido");
    }
  }
}

const workflowDir = join(root, ".github", "workflows");
for (const file of walk(workflowDir).filter((path) => /\.ya?ml$/.test(path))) {
  const content = readFileSync(file, "utf8");
  const display = relative(root, file);

  if (/\bpull_request_target\s*:/.test(content)) {
    fail(display + ": pull_request_target no permitido");
  }

  if (/runs-on:\s*ubuntu-latest\b/.test(content)) {
    fail(display + ": runner ubuntu-latest no permitido; fijar versión");
  }

  if (!/^permissions:\s*\n\s+contents:\s+read\s*$/m.test(content)) {
    fail(display + ": faltan permisos globales contents: read explícitos");
  }

  for (const match of content.matchAll(/^\s*uses:\s*([^\s#]+).*$/gm)) {
    const action = match[1];
    if (action.startsWith("./")) continue;
    if (!/@[0-9a-f]{40}$/i.test(action)) {
      fail(display + ": action no fijada a un SHA inmutable: " + action);
    }
  }

  for (const match of content.matchAll(/uses:\s*actions\/checkout@[0-9a-f]{40}([\s\S]{0,220})/gi)) {
    if (!/persist-credentials:\s*false/.test(match[1])) {
      fail(display + ": checkout debe usar persist-credentials:false");
    }
  }
}

const snapshotWorkflowPath = join(workflowDir, "github-snapshots.yml");
if (existsSync(snapshotWorkflowPath)) {
  const workflow = readFileSync(snapshotWorkflowPath, "utf8");
  const beforeSteps = workflow.split(/^\s*steps:\s*$/m)[0] ?? "";

  if (/CLOUDFLARE_D1_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_D1_DATABASE_ID/.test(beforeSteps)) {
    fail("github-snapshots.yml: secretos D1 no pueden existir a nivel job");
  }

  for (const required of [
    "Reject production persistence outside main",
    "github.ref != 'refs/heads/main'",
    "node scripts/github-snapshot.mjs --manual --persist",
  ]) {
    if (!workflow.includes(required)) {
      fail("github-snapshots.yml: falta guard de persistencia: " + required);
    }
  }
}

const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

for (const path of tracked) {
  if (/^(?:.*\/)?\.env(?:\..+)?$/.test(path) && !path.endsWith(".env.example")) {
    fail(path + ": archivo de entorno real versionado");
  }
  if (/\.(?:pem|key|p12|pfx)$/i.test(path)) {
    fail(path + ": material criptográfico privado potencialmente versionado");
  }
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (packageJson.packageManager !== "pnpm@11.28.0") {
  fail("package.json: packageManager debe permanecer fijado a pnpm@11.28.0");
}

const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
for (const section of ["dependencies", "devDependencies"]) {
  for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
    if (typeof version !== "string" || !exactVersionPattern.test(version)) {
      fail(`package.json: ${section}.${name} debe usar una versión registry exacta`);
    }
  }
}

if (!existsSync(join(root, "pnpm-lock.yaml"))) {
  fail("pnpm-lock.yaml: lockfile obligatorio ausente");
}

const workspacePath = join(root, "pnpm-workspace.yaml");
const workspace = readFileSync(workspacePath, "utf8");
for (const required of [
  "minimumReleaseAge: 1440",
  "blockExoticSubdeps: true",
  "saveExact: true",
  "level: moderate",
  "workerd: true",
]) {
  if (!workspace.includes(required)) {
    fail("pnpm-workspace.yaml: falta política supply-chain " + required);
  }
}
if (/set this to true or false/i.test(workspace)) {
  fail("pnpm-workspace.yaml: placeholder allowBuilds no resuelto");
}
const allowBuildBlock = workspace.match(/allowBuilds:\s*\n((?:\s{2,}.+\n?)*)/);
if (!allowBuildBlock || !/^\s*workerd:\s*true\s*$/m.test(allowBuildBlock[1])) {
  fail("pnpm-workspace.yaml: allowBuilds debe aprobar explícitamente sólo workerd");
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
  '"form-action \'none\'"',
  '"worker-src \'self\'"',
  '"connect-src \'self\'"',
  'geolocation=()',
  '{ key: "Referrer-Policy", value: "no-referrer" }',
]) {
  if (!nextConfig.includes(policy)) {
    fail("next.config.ts: falta política deny-by-default " + policy);
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
    " archivos de código + " +
    svgFiles.length +
    " SVG revisados)",
);
