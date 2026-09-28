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

const sourceFiles = walk(join(root, "src")).filter((path) => /\.(?:js|jsx|ts|tsx)$/.test(path));
const forbidden = [
  ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\b/],
  ["eval()", /\beval\s*\(/],
  ["new Function()", /\bnew\s+Function\s*\(/],
  ["document.write()", /\bdocument\.write\s*\(/],
];

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  const display = relative(root, file);

  for (const [label, pattern] of forbidden) {
    if (pattern.test(content)) {
      fail(display + ": uso prohibido de " + label);
    }
  }

  if (/["']use client["'];/.test(content) && /process\.env\.(?!NEXT_PUBLIC_)/.test(content)) {
    fail(display + ": secreto/variable server-side referenciada desde un componente cliente");
  }

  if (/http:\/\//i.test(content)) {
    fail(display + ": URL HTTP no cifrada en código de aplicación");
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

if (!existsSync(join(root, "pnpm-lock.yaml"))) {
  fail("pnpm-lock.yaml: lockfile obligatorio ausente");
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

if (failures.length > 0) {
  console.error("Security baseline: FAIL");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Security baseline: PASS (" + sourceFiles.length + " archivos de código revisados)");
