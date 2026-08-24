import { useEffect, useState } from "react";
import { fetchSessie, fetchSessies, exporteerSessie } from "./api";
import type { SessieDetail, SessieSummary } from "./types";

const STAP_LABELS: Record<string, string> = {
  triage: "Triage",
  anamnese: "Anamnese",
  test: "Testselectie",
  interpretatie: "Interpretatie",
  strategie: "Behandelstrategie",
  educatie: "Patiënteducatie",
  followup: "Follow-up",
};

/**
 * "Mijn sessies" — requirements §27: "Terugkijken op een eerder consult...
 * raadpleegbaar ná het consult." Toont alleen nog niet-verlopen sessies
 * (§5.1) van de ingelogde therapeut.
 */
export function SessiesOverzicht() {
  const [sessies, setSessies] = useState<SessieSummary[] | null>(null);
  const [geselecteerd, setGeselecteerd] = useState<SessieDetail | null>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetchSessies()
      .then(setSessies)
      .catch((e) => setFout(String(e)));
  }, []);

  async function selecteer(id: string) {
    setLaden(true);
    setFout(null);
    try {
      setGeselecteerd(await fetchSessie(id));
    } catch (e) {
      setFout(String(e));
    } finally {
      setLaden(false);
    }
  }

  async function onExporteer(id: string) {
    try {
      const res = await exporteerSessie(id);
      setGeselecteerd((prev) => (prev ? { ...prev, samenvatting: res.samenvatting, geëxporteerdOp: new Date().toISOString() } : prev));
      setSessies((prev) => prev?.filter((s) => s.id !== id) ?? prev);
    } catch (e) {
      setFout(String(e));
    }
  }

  return (
    <div>
      <header className="app-header">
        <h1>Mijn sessies</h1>
        <p className="hint">
          Nog niet-verlopen sessies (§5.1: 90 dagen na start, of direct na export). Geen dossiervoering —
          een sessiegebonden weergave om zelf over te nemen in het eigen EPD (§22/§27).
        </p>
      </header>

      {fout && <p className="error">{fout}</p>}

      <main className="main-layout">
        <section className="results-section">
          {sessies === null ? (
            <p className="hint">Laden…</p>
          ) : sessies.length === 0 ? (
            <p className="hint">Geen sessies (meer) beschikbaar.</p>
          ) : (
            <ul className="sessies-list">
              {sessies.map((s) => (
                <li key={s.id}>
                  <button type="button" className="sessie-card" onClick={() => selecteer(s.id)}>
                    <div className="titel">{s.aandoeningNaam ?? "Nog geen hoofdhypothese"}</div>
                    <p className="hint">
                      {new Date(s.gestartOp).toLocaleString("nl-NL")} · {s.aantalStappen} stap
                      {s.aantalStappen === 1 ? "" : "pen"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="detail-section">
          {laden && <p className="hint">Laden…</p>}
          {!laden && !geselecteerd && (
            <p className="empty-state">Selecteer een sessie om de samenvatting te bekijken.</p>
          )}
          {!laden && geselecteerd && (
            <div>
              <div className="detail-header">
                <span className="badge">{new Date(geselecteerd.gestartOp).toLocaleString("nl-NL")}</span>
                {geselecteerd.aandoeningNaam && <span className="badge evidence-badge">{geselecteerd.aandoeningNaam}</span>}
              </div>
              <h2>Samenvatting</h2>
              <textarea
                className="samenvatting-tekst"
                readOnly
                value={geselecteerd.samenvatting}
                rows={Math.min(14, geselecteerd.samenvatting.split("\n").length + 1)}
              />
              {!geselecteerd.geëxporteerdOp && (
                <div className="flow-actions">
                  <button type="button" className="btn-primary" onClick={() => onExporteer(geselecteerd.id)}>
                    Exporteren
                  </button>
                </div>
              )}

              <div className="detail-block">
                <h3>Stappen ({geselecteerd.stappen.length})</h3>
                <ul className="relatie-list">
                  {geselecteerd.stappen.map((s) => (
                    <li key={s.id} className="relatie-row">
                      <div className="relatie-header">
                        <span className="badge">{STAP_LABELS[s.stapType] ?? s.stapType}</span>
                        <span className="hint">{new Date(s.timestamp).toLocaleTimeString("nl-NL")}</span>
                      </div>
                      <p>{s.bevinding}</p>
                      {s.objectIdsGebruikt.length > 0 && (
                        <div className="kwalificatie">
                          {s.objectIdsGebruikt.map((id) => (
                            <span key={id} className="kwalificatie-chip">
                              {id}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
