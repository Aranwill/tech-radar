"use client";

import { useEffect, useState } from "react";
import { RepositoryCard } from "@/components/RepositoryCard";
import type { RepositoryBlock } from "@/lib/ui-contract";

type GithubApiResponse = {
  repositories: RepositoryBlock[];
  partial: boolean;
  fetchedAt: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: GithubApiResponse }
  | { status: "error" };

export function LiveGithubRepositories() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/github/repositories", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error("GitHub datasource unavailable");
        }

        const data = (await response.json()) as GithubApiResponse;
        setState({ status: "ready", data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState({ status: "error" });
      }
    }

    void load();

    return () => controller.abort();
  }, []);

  return (
    <section className="live-section" aria-labelledby="github-live-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GITHUB · DATOS REALES</span>
          <h2 id="github-live-title">Repositorios observados</h2>
        </div>
        <span className="live-badge">LIVE</span>
      </div>

      <p className="section-note">
        Primer datasource real. Por ahora mostramos estado actual; el momentum aparecerá cuando tengamos snapshots históricos propios.
      </p>

      <div className="live-repo-grid">
        {state.status === "loading" && (
          <div className="live-status-card" role="status">
            Conectando con GitHub…
          </div>
        )}

        {state.status === "error" && (
          <div className="live-status-card" role="status">
            GitHub no está disponible en este momento. La interfaz sigue operativa sin la fuente externa.
          </div>
        )}

        {state.status === "ready" &&
          state.data.repositories.map((repository) => (
            <RepositoryCard block={repository} className="live-repository-card" key={repository.id} />
          ))}
      </div>

      {state.status === "ready" && state.data.partial && (
        <p className="source-warning">Algunos datos complementarios no pudieron actualizarse; se muestran los datos disponibles.</p>
      )}
    </section>
  );
}
