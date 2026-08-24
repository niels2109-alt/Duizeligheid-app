import { useEffect, useState } from "react";
import { fetchSessie, exporteerSessie } from "../sessies/api";

/**
 * Sessie-samenvatting (requirements §2.3): leesbare samenvatting van de
 * doorlopen stappen, kopieerbaar/printbaar. "Exporteren" bevriest de tekst
 * (de server slaat 'm versleuteld op) en laat de sessie direct vervallen
 * (§5.1) — vóór export toont dit paneel telkens de actuele, live opgebouwde
 * samenvatting.
 */
export function SamenvattingPaneel({ sessieId }: { sessieId: string }) {
  const [tekst, setTekst] = useState<string | null>(null);
  const [geëxporteerd, setGeëxporteerd] = useState(false);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);

  useEffect(() => {
    fetchSessie(sessieId)
      .then((s) => {
        setTekst(s.samenvatting);
        setGeëxporteerd(s.geëxporteerdOp != null);
      })
      .catch((e) => setFout(String(e)))
      .finally(() => setLaden(false));
  }, [sessieId]);

  async function onExporteer() {
    setFout(null);
    try {
      const res = await exporteerSessie(sessieId);
      setTekst(res.samenvatting);
      setGeëxporteerd(true);
    } catch (e) {
      setFout(String(e));
    }
  }

  async function onKopieer() {
    if (!tekst) return;
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      setFout("Kopiëren naar klembord is mislukt — selecteer en kopieer de tekst handmatig.");
    }
  }

  if (laden) return <p className="hint">Samenvatting laden…</p>;

  return (
    <div className="samenvatting-paneel">
      <h3>Sessie-samenvatting</h3>
      {fout && <p className="error">{fout}</p>}
      <textarea className="samenvatting-tekst" readOnly value={tekst ?? ""} rows={Math.min(12, (tekst?.split("\n").length ?? 1) + 1)} />
      <p className="hint">
        {geëxporteerd
          ? "Geëxporteerd — deze sessie is niet langer opvraagbaar via “Mijn sessies” (§5.1)."
          : "Nog niet geëxporteerd. Handmatig kopiëren/printen voor overname in het eigen EPD — geen automatische koppeling (§2.3)."}
      </p>
      <div className="flow-actions">
        <button type="button" className="btn-secondary" onClick={onKopieer} disabled={!tekst}>
          {gekopieerd ? "Gekopieerd ✓" : "Kopiëren"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          Printen
        </button>
        {!geëxporteerd && (
          <button type="button" className="btn-primary" onClick={onExporteer}>
            Exporteren
          </button>
        )}
      </div>
    </div>
  );
}
