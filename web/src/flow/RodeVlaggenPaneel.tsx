import { useEffect, useState } from "react";
import { fetchRodeVlaggen } from "../api";
import type { Rol, RodeVlagCategorie } from "../types";

interface Props {
  rol: Rol;
}

function fmtLabel(value: string | null): string {
  return value ? value.replace(/_/g, " ") : "—";
}

/**
 * Rode-vlaggenmodule als losstaand, herbruikbaar component — requirements
 * §11.1/§11.4 stap 2. Aandoening-onafhankelijk: toont alle RF-001 t/m
 * RF-013, gegroepeerd in klinische categorieën (server/src/redFlags.ts),
 * i.p.v. de per-aandoening rode-vlag-weergave die V1's bestaande
 * ReasoningFlow.tsx/RedFlagModal.tsx al hebben (die blijven ongewijzigd en
 * gebruiken dit component niet).
 *
 * Dit component is nu zelfstandig bruikbaar maar wordt in deze stap nog
 * nergens gemonteerd — dat gebeurt bij de toekomstige V2-flow (§11.4 stap
 * 3+, "altijd-actieve module aan het begin"). Puur weergavewerk: net als
 * V1 laat dit geen enkele conclusie automatisch trekken uit een aangevinkt
 * kenmerk ("nooit 'rode vlag = automatisch verwijzen'", V2-ontwerp §5) —
 * dat gebeurt pas wanneer een aanroepende flow dit component daadwerkelijk
 * aan antwoorden koppelt.
 */
export function RodeVlaggenPaneel({ rol }: Props) {
  const [categorieen, setCategorieen] = useState<RodeVlagCategorie[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    let actief = true;
    fetchRodeVlaggen(rol)
      .then((data) => {
        if (actief) setCategorieen(data.categorieen);
      })
      .catch(() => {
        if (actief) setFout("Kon rode vlaggen niet ophalen.");
      });
    return () => {
      actief = false;
    };
  }, [rol]);

  if (fout) return <p className="hint">{fout}</p>;
  if (!categorieen) return <p className="hint">Rode vlaggen laden…</p>;

  return (
    <aside className="rode-vlaggen-paneel">
      <h3>Rode vlaggen</h3>
      {categorieen.map((cat) => (
        <div key={cat.categorie} className="rode-vlag-categorie">
          <h4>{cat.categorie}</h4>
          <ul className="rode-vlag-list">
            {cat.redFlaggen.map((rf) => (
              <li key={rf.id} className="rode-vlag-item">
                <div className="rode-vlag-head">
                  <span className="rode-vlag-naam">{rf.naam}</span>
                  <span className="badge critical">{fmtLabel(rf.actietype)}</span>
                </div>
                <p className="rode-vlag-kernbeschrijving">{rf.kernbeschrijving}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
