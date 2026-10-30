import { useState } from "react";
import type { FlowAction } from "./types";

/**
 * NPQ-score + patroon-type-invoer voor een trendmatig vervolgconsult
 * (requirements §8.4/§8.5 stap 4, referentiedocument §15). Lokale
 * formulierstate tot bevestiging — dispatcht dan één FOLLOWUP_TREND_INVOER-
 * actie (zelfde patroon als de andere follow-up-lussen: pas een trail-entry
 * bij een voltooide, bevestigde invoer).
 */
export function TrendInvoerForm({ dispatch }: { dispatch: (action: FlowAction) => void }) {
  const [npqScore, setNpqScore] = useState("");
  const [patroonType, setPatroonType] = useState<"verwachte_fluctuatie" | "afwijkend_beloop" | null>(null);
  const [notitie, setNotitie] = useState("");

  const score = Number(npqScore);
  const geldig = npqScore !== "" && Number.isFinite(score) && score >= 0 && score <= 100 && patroonType !== null;

  return (
    <>
      <h2>Trendmatige evaluatie</h2>
      <p className="hint">
        Follow-up bij dit item is trendmatig (referentiedocument §15) — geen binaire hertest. De
        NPQ-score wordt over meerdere sessies gevolgd om een patroon te herkennen: verwachte
        fluctuatie (bijv. terugval bij stress hoort bij het beloop) versus afwijkend beloop.
      </p>
      <label className="veld">
        NPQ-score (0–100)
        <input type="number" min={0} max={100} value={npqScore} onChange={(e) => setNpqScore(e.target.value)} />
      </label>
      <div className="fase-opties">
        <button
          type="button"
          className={patroonType === "verwachte_fluctuatie" ? "chip-toggle active" : "chip-toggle"}
          onClick={() => setPatroonType("verwachte_fluctuatie")}
        >
          Verwachte fluctuatie
        </button>
        <button
          type="button"
          className={patroonType === "afwijkend_beloop" ? "chip-toggle active" : "chip-toggle"}
          onClick={() => setPatroonType("afwijkend_beloop")}
        >
          Afwijkend beloop
        </button>
      </div>
      <label className="veld">
        Notitie — functionele maten (optioneel)
        <textarea value={notitie} onChange={(e) => setNotitie(e.target.value)} rows={3} />
      </label>
      <button
        type="button"
        className="btn-primary"
        disabled={!geldig}
        onClick={() => patroonType && dispatch({ type: "FOLLOWUP_TREND_INVOER", npqScore: score, patroonType, notitie })}
      >
        Vastleggen
      </button>
    </>
  );
}
