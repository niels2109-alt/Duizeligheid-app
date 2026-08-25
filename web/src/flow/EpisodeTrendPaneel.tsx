import { useEffect, useState } from "react";
import { fetchEpisodeTrend } from "../episodes/api";
import type { EpisodeTrend } from "../episodes/types";

/**
 * Trendweergave op episode-niveau (requirements §8.5 stap 4) — toont alle
 * gekoppelde sessies van dit behandeltraject chronologisch, met hun
 * follow-up-bevindingen (NPQ-score/patroon-type/notitie, vrije tekst — zie
 * episodes.ts). Patroonherkenning (verwachte fluctuatie vs afwijkend
 * beloop, referentiedocument §15) blijft hier bewust klinisch oordeel van
 * de therapeut per consult — dit scherm legt alleen de reeks bloot waarop
 * dat oordeel gebaseerd wordt, classificeert zelf niets op episode-niveau.
 */
export function EpisodeTrendPaneel({ episodeId }: { episodeId: string }) {
  const [trend, setTrend] = useState<EpisodeTrend | null>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetchEpisodeTrend(episodeId)
      .then(setTrend)
      .catch((e) => setFout(String(e)))
      .finally(() => setLaden(false));
  }, [episodeId]);

  if (laden) return <p className="hint">Trend laden…</p>;
  if (fout) return <p className="error">{fout}</p>;
  if (!trend) return null;

  return (
    <div className="episode-trend-paneel">
      <h3>Trend — {trend.aandoeningNaam}</h3>
      <p className="hint">
        Traject gestart {new Date(trend.gestartOp).toLocaleDateString("nl-NL")} · {trend.sessies.length}{" "}
        sessie(s) in dit traject.
      </p>
      <div className="trend-tabel-wrap">
        <table className="trend-tabel">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Follow-up-bevinding</th>
            </tr>
          </thead>
          <tbody>
            {trend.sessies.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.gestartOp).toLocaleDateString("nl-NL")}</td>
                <td>
                  {s.followup.length === 0
                    ? "—"
                    : s.followup.map((f) => <div key={f.id}>{f.bevinding}</div>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
