import { z } from "zod";

const safeUrl = z.string().url().refine((url) => {
  const protocol = new URL(url).protocol;
  return protocol === "https:";
}, "Sólo se permiten URLs HTTPS.");

const repositoryContributorSchema = z.object({
  login: z.string().min(1).max(80),
  avatarUrl: safeUrl,
  profileUrl: safeUrl,
  contributions: z.number().int().nonnegative(),
});

const storyBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("story"),
  category: z.string().min(1).max(40),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  source: z.string().min(1).max(80),
  sourceUrl: safeUrl,
  age: z.string().min(1).max(30),
  evidence: z.string().min(1).max(80),
});

export const repositoryBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("repository"),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  url: safeUrl,
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative().optional(),
  openIssuesAndPullRequests: z.number().int().nonnegative().optional(),
  contributorCount: z.number().int().nonnegative().nullable().optional(),
  contributors: z.array(repositoryContributorSchema).max(8).nullable().optional(),
  growth7d: z.number().optional(),
  language: z.string().min(1).max(40),
  tags: z.array(z.string().min(1).max(30)).max(6),
  trend: z.array(z.number().min(0).max(100)).min(3).max(30).optional(),
  updatedAt: z.string().datetime().optional(),
  dataState: z.enum(["live", "snapshot"]),
});

const statBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("stat"),
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(30),
  delta: z.string().max(60),
  note: z.string().min(1).max(180),
});

export const uiBlockSchema = z.discriminatedUnion("kind", [
  storyBlockSchema,
  repositoryBlockSchema,
  statBlockSchema,
]);

export const dashboardSchema = z.object({
  version: z.literal("0.1"),
  demo: z.boolean(),
  blocks: z.array(uiBlockSchema).max(50),
});

export const githubRepositoriesApiSchema = z.object({
  repositories: z.array(repositoryBlockSchema).min(1).max(50),
  partial: z.boolean(),
  servedAt: z.string().datetime(),
}).strict();

export type UiBlock = z.infer<typeof uiBlockSchema>;
export type RepositoryBlock = z.infer<typeof repositoryBlockSchema>;
export type GithubRepositoriesApiResponse = z.infer<typeof githubRepositoriesApiSchema>;
export type DashboardModel = z.infer<typeof dashboardSchema>;
