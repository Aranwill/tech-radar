import { z } from "zod";
import { repositoryBlockSchema, type RepositoryBlock } from "@/lib/ui-contract";

const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_API_ORIGIN = "https://api.github.com";
const CACHE_SECONDS = 900;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 1_000_000;

const curatedRepositories = [
  "a2ui-project/a2ui",
  "modelcontextprotocol/ext-apps",
  "huggingface/transformers",
] as const;

const githubWebUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "github.com";
}, "GitHub devolvió una URL web no permitida.");

const githubRepositorySchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string().min(1).max(100),
  description: z.string().nullable(),
  html_url: githubWebUrlSchema,
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  language: z.string().nullable(),
  topics: z.array(z.string()).optional().default([]),
  updated_at: z.string().datetime(),
});

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN?.trim();

  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "tech-radar",
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
}

async function parseBoundedJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("GitHub devolvió un content-type inesperado.");
  }

  const advertisedLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_RESPONSE_BYTES) {
    throw new Error("GitHub devolvió una respuesta demasiado grande.");
  }

  const payload = await response.arrayBuffer();
  if (payload.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("GitHub devolvió una respuesta demasiado grande.");
  }

  return JSON.parse(new TextDecoder().decode(payload)) as unknown;
}

async function fetchRepository(repository: (typeof curatedRepositories)[number]): Promise<RepositoryBlock> {
  const response = await fetch(GITHUB_API_ORIGIN + "/repos/" + repository, {
    headers: githubHeaders(),
    next: { revalidate: CACHE_SECONDS },
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("GitHub respondió " + response.status + ".");
  }

  const raw = githubRepositorySchema.parse(await parseBoundedJson(response));

  return repositoryBlockSchema.parse({
    id: "github-" + raw.id,
    kind: "repository",
    name: raw.full_name,
    description: (raw.description ?? "Repositorio sin descripción pública.").slice(0, 300),
    url: raw.html_url,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssuesAndPullRequests: raw.open_issues_count,
    language: (raw.language ?? "Sin dato").slice(0, 40),
    tags: raw.topics.slice(0, 6).map((topic) => topic.slice(0, 30)),
    updatedAt: raw.updated_at,
    dataState: "live",
  });
}

export async function getCuratedGithubRepositories() {
  const settled = await Promise.allSettled(curatedRepositories.map(fetchRepository));
  const repositories = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const failed = settled.filter((result) => result.status === "rejected").length;

  if (failed > 0) {
    console.warn("[github-source] upstream_partial_failure", {
      failed,
      total: curatedRepositories.length,
    });
  }

  if (repositories.length === 0) {
    throw new Error("No fue posible obtener ningún repositorio curado.");
  }

  return {
    repositories,
    partial: failed > 0,
  };
}
