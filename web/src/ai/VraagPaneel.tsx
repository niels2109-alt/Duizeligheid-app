import { useState, type FormEvent } from "react";
import { stelVraag } from "./api";
import type { AIAntwoord } from "./types";
import type { Rol } from "../types";
import { naarBPPD } from "../components/weergave";

/**
 * AI-laag — requirements §3. Elk antwoord toont verplicht de gebruikte
 * object-id's en evidence-niveaus (traceerbaarheid, eis 1); een vraag
 * zonder kennisbank-match krijgt een expliciete melding (eis 2, nooit
 * stilzwijgend aangevuld); een gedeeltelijke match met een rode vlag wordt
 * altijd als eerste en met een waarschuwing getoond (eis 3).
 */
export function VraagPaneel({ rol }: { rol: Rol }) {
  const [vraag, setVraag] = useState("");
  const [antwoord, setAntwoord] = useState<AIAntwoord | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!vraag.trim()) return;
    setBezig(true);
    setFout(null);
    try {
      setAntwoord(await stelVraag(vraag.trim(), rol));
    } catch (err) {
      setFout(String(err instanceof Error ? err.message : err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="vraag-paneel">
      <h3>Vraag stellen aan de kennisbank</h3>
      <p className="hint">
        Elk antwoord is herleidbaar tot specifieke kennisbank-objecten — geen vrije generatie (§3).
      </p>
      <form onSubmit={onSubmit} className="vraag-form">
        <input
          type="text"
          placeholder="Bijv. 'Wat is BPPD?' of 'Wat betekent downbeat nystagmus?'"
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={bezig || !vraag.trim()}>
          {bezig ? "Bezig…" : "Vragen"}
        </button>
      </form>

      {fout && <p className="error">{fout}</p>}

      {antwoord && (
        <div className={antwoord.escalatie ? "antwoord-kaart escalatie" : "antwoord-kaart"}>
          {antwoord.geenAntwoord ? (
            <p className="geen-antwoord">{naarBPPD(antwoord.antwoordtekst)}</p>
          ) : (
            <>
              {antwoord.escalatie && <p className="escalatie-label">⚠ Signaal dat om voorzichtigheid vraagt</p>}
              <p className="antwoord-tekst">{naarBPPD(antwoord.antwoordtekst)}</p>
              <div className="antwoord-meta">
                <span className="badge">{antwoord.bron}</span>
                {antwoord.objectIds.map((id) => (
                  <span key={id} className="badge mono">
                    {id}
                  </span>
                ))}
                {antwoord.evidenceNiveaus.map((e) => (
                  <span key={e} className="badge evidence-badge">
                    {e.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
