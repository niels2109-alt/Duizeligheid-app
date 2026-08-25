import type { EpisodeSummary, EpisodeTrend } from "./types";

async function json<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let message = fallbackError;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // negeer
    }
    throw new Error(message);
  }
  return res.json();
}

export async function startEpisode(aandoeningId: string): Promise<{ id: string }> {
  const res = await fetch("/api/episodes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aandoeningId }),
  });
  return json(res, "Kon behandeltraject niet starten.");
}

export async function fetchEpisodes(aandoeningId: string): Promise<EpisodeSummary[]> {
  const res = await fetch(`/api/episodes?aandoeningId=${encodeURIComponent(aandoeningId)}`, {
    credentials: "include",
  });
  return json(res, "Kon behandeltrajecten niet ophalen.");
}

export async function fetchEpisodeTrend(episodeId: string): Promise<EpisodeTrend> {
  const res = await fetch(`/api/episodes/${encodeURIComponent(episodeId)}/trend`, { credentials: "include" });
  return json(res, "Kon trendweergave niet ophalen.");
}
