import { z } from "zod";
import repositoryConfig from "../../../config/github-repositories.json";
import { repositoryBlockSchema, type RepositoryBlock } from "@/lib/ui-contract";

const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_API_ORIGIN = "https://api.github.com";
const CACHE_SECONDS = 900;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const REPOSITORY_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

function isRepositoryIdentifier(value: string) {
  const parts = value.split("/");
  return (
    parts.length === 2 &&
    parts.every(
      (segment) =>
        REPOSITORY_SEGMENT_PATTERN.test(segment) &&
        segment !== "." &&
        segment !== "..",
    )
  );
}

function repositoryApiPath(repository: string) {
  if (!isRepositoryIdentifier(repository)) {
    throw new Error("Repositorio curado inválido.");
  }

  const [owner, name] = repository.split("/");
  return "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name);
}

const curatedRepositoryConfigSchema = z.object({
  version: z.literal(1),
  repositories: z
    .array(z.string().refine(isRepositoryIdentifier, "Repositorio curado inválido."))
    .min(1)
    .max(50)
    .refine(
      (repositories) => new Set(repositories).size === repositories.length,
      "El catálogo GitHub contiene repositorios duplicados.",
    ),
});

const curatedRepositories = curatedRepositoryConfigSchema.parse(repositoryConfig).repositories;

const githubWebUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "github.com";
}, "GitHub devolvió una URL web no permitida.");

const githubAvatarUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "avatars.githubusercontent.com";
}, "GitHub devolvió una URL de avatar no permitida.");

const githubRepositorySchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  full_name: z.string().min(1).max(201),
  private: z.literal(false),
  visibility: z.literal("public"),
  description: z.string().nullable(),
  html_url: githubWebUrlSchema,
  stargazers_count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  forks_count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  open_issues_count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  language: z.string().nullable(),
  topics: z.array(z.string()).optional().default([]),
  updated_at: z.string().datetime(),
});

const contributorProbeSchema = z.array(
  z.object({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  }),
).max(1);

const githubContributorSchema = z.object({
  login: z.string().min(1).max(80),
  avatar_url: githubAvatarUrlSchema,
  html_url: githubWebUrlSchema,
  contributions: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
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

function getLastPageFromLinkHeader(linkHeader: string | null) {
  if (!linkHeader) return null;

  for (const segment of linkHeader.split(",")) {
    if (!segment.includes('rel="last"')) continue;

    const match = segment.match(/<([^>]+)>/);
    if (!match) return null;

    const page = Number(new URL(match[1]).searchParams.get("page"));
    return Number.isSafeInteger(page) && page >= 0 ? page : null;
  }

  return null;
}

function assertPublicCanonicalRepository(
  repository: string,
  raw: z.infer<typeof githubRepositorySchema>,
) {
  const url = new URL(raw.html_url);
  const expectedPath = "/" + repository.toLowerCase();
  const actualPath = url.pathname.replace(/\/+$/, "").toLowerCase();

  if (
    raw.full_name.toLowerCase() !== repository.toLowerCase() ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    actualPath !== expectedPath
  ) {
    throw new Error("GitHub devolvió un repositorio fuera del catálogo público permitido.");
  }
}

async function fetchContributorCount(repository: string) {
  try {
    const response = await fetch(
      GITHUB_API_ORIGIN + repositoryApiPath(repository) + "/contributors?per_page=1&anon=false",
      {
        headers: githubHeaders(),
        next: { revalidate: CACHE_SECONDS },
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (response.status === 202) return null;
    if (!response.ok) throw new Error("GitHub contributors respondió " + response.status + ".");

    const raw = contributorProbeSchema.parse(await parseBoundedJson(response));
    if (raw.length === 0) return 0;

    return getLastPageFromLinkHeader(response.headers.get("link")) ?? 1;
  } catch (error) {
    console.warn("[github-source] contributor_count_unavailable", {
      repository,
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}

async function fetchTopContributors(repository: string) {
  try {
    const response = await fetch(
      GITHUB_API_ORIGIN + repositoryApiPath(repository) + "/contributors?per_page=8&anon=false",
      {
        headers: githubHeaders(),
        next: { revalidate: CACHE_SECONDS },
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (response.status === 202) return null;
    if (!response.ok) throw new Error("GitHub contributors destacados respondió " + response.status + ".");

    const raw = z.array(githubContributorSchema).max(8).parse(await parseBoundedJson(response));

    return raw.map((contributor) => ({
      login: contributor.login,
      avatarUrl: contributor.avatar_url,
      profileUrl: contributor.html_url,
      contributions: contributor.contributions,
    }));
  } catch (error) {
    console.warn("[github-source] contributors_preview_unavailable", {
      repository,
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}

async function fetchRepository(repository: string): Promise<RepositoryBlock> {
  const [response, contributorCount, contributors] = await Promise.all([
    fetch(GITHUB_API_ORIGIN + repositoryApiPath(repository), {
      headers: githubHeaders(),
      next: { revalidate: CACHE_SECONDS },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    fetchContributorCount(repository),
    fetchTopContributors(repository),
  ]);

  if (!response.ok) throw new Error("GitHub respondió " + response.status + ".");

  const raw = githubRepositorySchema.parse(await parseBoundedJson(response));
  assertPublicCanonicalRepository(repository, raw);

  return repositoryBlockSchema.parse({
    id: "github-" + raw.id,
    kind: "repository",
    name: raw.full_name,
    description: (raw.description ?? "Repositorio sin descripción pública.").slice(0, 300),
    url: raw.html_url,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssuesAndPullRequests: raw.open_issues_count,
    contributorCount,
    contributors,
    language: (raw.language ?? "Sin dato").slice(0, 40),
    tags: raw.topics.slice(0, 6).map((topic) => topic.slice(0, 30)),
    updatedAt: raw.updated_at,
    dataState: "live",
  });
}

export async function getCuratedGithubRepositories() {
  const settled = await Promise.allSettled(curatedRepositories.map(fetchRepository));
  const repositories = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
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

  const enrichmentIncomplete = repositories.some(
    (repository) => repository.contributorCount === null || repository.contributors === null,
  );

  return {
    repositories,
    partial: failed > 0 || enrichmentIncomplete,
  };
}
