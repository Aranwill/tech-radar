import { z } from "zod";
import { repositoryBlockSchema, type RepositoryBlock } from "@/lib/ui-contract";

const GITHUB_API_VERSION = "2026-03-10";
const CACHE_SECONDS = 900;

const curatedRepositories = [
  "a2ui-project/a2ui",
  "modelcontextprotocol/ext-apps",
  "huggingface/transformers",
] as const;

const githubRepositorySchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string().min(1),
  description: z.string().nullable(),
  html_url: z.string().url(),
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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchRepository(repository: (typeof curatedRepositories)[number]): Promise<RepositoryBlock> {
  const response = await fetch(`https://api.github.com/repos/${repository}`, {
    headers: githubHeaders(),
    next: { revalidate: CACHE_SECONDS },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`GitHub respondió ${response.status} para ${repository}`);
  }

  const raw = githubRepositorySchema.parse(await response.json());

  return repositoryBlockSchema.parse({
    id: `github-${raw.id}`,
    kind: "repository",
    name: raw.full_name,
    description: (raw.description ?? "Repositorio sin descripción pública.").slice(0, 300),
    url: raw.html_url,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssues: raw.open_issues_count,
    language: raw.language ?? "Sin dato",
    tags: raw.topics.slice(0, 6),
    updatedAt: raw.updated_at,
    dataState: "live",
  });
}

export async function getCuratedGithubRepositories() {
  const settled = await Promise.allSettled(curatedRepositories.map(fetchRepository));
  const repositories = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const failed = settled.filter((result) => result.status === "rejected").length;

  if (repositories.length === 0) {
    throw new Error("No fue posible obtener ningún repositorio curado.");
  }

  return {
    repositories,
    partial: failed > 0,
  };
}
