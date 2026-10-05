import { getCuratedGithubRepositories } from "@/lib/github/client";

const CACHE_SECONDS = 900;

export async function GET() {
  try {
    const result = await getCuratedGithubRepositories();

    return Response.json(
      {
        ...result,
        servedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600`,
        },
      },
    );
  } catch {
    return Response.json(
      {
        error: "GitHub no está disponible temporalmente.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
