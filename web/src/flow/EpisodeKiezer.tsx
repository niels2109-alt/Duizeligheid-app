import { useEffect, useState } from "react";
import { fetchEpisodes, startEpisode } from "../episodes/api";
import type { EpisodeSummary } from "../episodes/types";

/**
 * Requirements §8.4/§8.5 stap 4: vóór de trendmatige follow-up moet het
 * consult aan een Behandelepisode gekoppeld worden — óf een nieuw traject,
 * óf een bestaand (actief, niet-vervallen) traject voor dezelfde aandoening.
 * Puur structurele keuze, geen klinische bevinding — vandaar los van de
 * reasoning-trail zelf (zie EPISODE_GEKOZEN in reducer.ts).
 */
export function EpisodeKiezer({
  aandoeningId,
  onGekozen,
}: {
  aandoeningId: string;
  onGekozen: (episodeId: string) => void;
}) {
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetchEpisodes(aandoeningId)
      .then(setEpisodes)
      .catch((e) => setFout(String(e)))
      .finally(() => setLaden(false));
  }, [aandoeningId]);

  async function kiesNieuw() {
    setBezig(true);
    setFout(null);
    try {
      const episode = await startEpisode(aandoeningId);
      onGekozen(episode.id);
    } catch (e) {
      setFout(String(e));
      setBezig(false);
    }
  }

  if (laden) return <p className="hint">Behandeltrajecten laden…</p>;

  return (
    <div className="episode-kiezer">
      <h3>Behandeltraject</h3>
      <p className="hint">
        Follow-up bij dit item is trendmatig (requirements §8.4, referentiedocument §15) — koppel dit
        consult aan het traject waar het bij hoort, zodat de NPQ-score over meerdere sessies gevolgd
        kan worden.
      </p>
      {fout && <p className="error">{fout}</p>}
      {episodes.length > 0 && (
        <ul className="episode-list">
          {episodes.map((e) => (
            <li key={e.id}>
              <button type="button" className="result-card" onClick={() => onGekozen(e.id)}>
                <div className="result-card-title">
                  Traject gestart {new Date(e.gestartOp).toLocaleDateString("nl-NL")}
                </div>
                <p className="result-snippet">{e.aantalSessies} sessie(s) tot nu toe.</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn-secondary" disabled={bezig} onClick={kiesNieuw}>
        {bezig ? "Bezig…" : "Nieuw traject starten"}
      </button>
    </div>
  );
}
