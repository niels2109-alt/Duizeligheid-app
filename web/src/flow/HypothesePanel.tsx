import type { HypotheseState, ReasoningTrailEntry } from "./types";

const WEGING_LABEL: Record<HypotheseState["weging"], string> = {
  hoog: "Hoog",
  matig: "Matig",
  laag: "Laag",
  uitgesloten: "Uitgesloten",
};

interface Props {
  hypotheses: HypotheseState[];
  trail: ReasoningTrailEntry[];
}

/**
 * Doorlopend zichtbare hypothese-lijst + redeneerspoor — requirements §2.1
 * punt 2 ("toont doorlopend de gewogen hypothese-lijst") en het "geen black
 * box"-principe (referentiedocument §12/§22 stap 4): elke wegingswijziging
 * is herleidbaar tot een concrete reden, geen kale score.
 */
export function HypothesePanel({ hypotheses, trail }: Props) {
  return (
    <aside className="hypothese-panel">
      <h3>Hypothesen</h3>
      {hypotheses.length === 0 ? (
        <p className="hint">Nog geen triagevraag beantwoord.</p>
      ) : (
        <ul className="hypothese-list">
          {hypotheses.map((h) => (
            <li key={h.id} className={"hypothese-item weging-" + h.weging}>
              <div className="hypothese-head">
                <span className="hypothese-naam">{h.naam}</span>
                <span className={"badge weging-badge weging-" + h.weging}>
                  {WEGING_LABEL[h.weging]}
                </span>
              </div>
              {!h.volledigUitgewerkt && (
                <p className="hypothese-note">Nog niet volledig uitgewerkt in dit systeem.</p>
              )}
              {h.redenen.length > 0 && (
                <ul className="redenen-list">
                  {h.redenen.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {trail.length > 0 && (
        <>
          <h3 className="trail-heading">Redeneerspoor</h3>
          <ol className="trail-list">
            {trail.map((t, i) => (
              <li key={i}>
                <span className="trail-stap">{t.stap}</span>
                <p>{t.tekst}</p>
                <div className="trail-meta">
                  {t.objectIds.map((id) => (
                    <span key={id} className="badge mono">
                      {id}
                    </span>
                  ))}
                  {t.evidenceNiveau && (
                    <span className="badge evidence">{t.evidenceNiveau.replace(/_/g, " ")}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </aside>
  );
}
