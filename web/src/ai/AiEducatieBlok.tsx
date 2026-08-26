import { useEffect, useState } from "react";
import { fetchPatientEducatie } from "./api";
import type { AIEducatieAntwoord } from "./types";

/**
 * AI-samengestelde patiëntvriendelijke versie van een educatie-item —
 * referentiedocument §12: "meerdere red flags samenvoegen tot
 * patiëntvriendelijke lijst, zoals bij EDU-001". Getoond vóór de
 * vrijgave-knop, zodat de therapeut ziet wat er precies (en met welke
 * bron-object-id's) naar de patiënt zou gaan — consistent met het
 * therapeut-controle-principe (§22 stap 6): vrijgave blijft een aparte,
 * expliciete handeling.
 */
export function AiEducatieBlok({ eduId, bevestigdeFactorIds }: { eduId: string; bevestigdeFactorIds?: string[] }) {
  const [antwoord, setAntwoord] = useState<AIEducatieAntwoord | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientEducatie(eduId, "patient", bevestigdeFactorIds)
      .then(setAntwoord)
      .catch((e) => setFout(String(e)));
    // bevestigdeFactorIds via join: een nieuwe array-referentie met dezelfde
    // inhoud mag geen onnodige herfetch triggeren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eduId, (bevestigdeFactorIds ?? []).join(",")]);

  if (fout) return <p className="error">{fout}</p>;
  if (!antwoord) return <p className="hint">Patiëntuitleg samenstellen…</p>;

  return (
    <div className="ai-educatie-blok">
      <h4>AI-samengestelde patiëntvriendelijke versie</h4>
      <p className="antwoord-tekst">{antwoord.antwoordtekst}</p>
      <div className="antwoord-meta">
        <span className="badge">{antwoord.bron}</span>
        {antwoord.objectIds.map((id) => (
          <span key={id} className="badge mono">
            {id}
          </span>
        ))}
      </div>
    </div>
  );
}
