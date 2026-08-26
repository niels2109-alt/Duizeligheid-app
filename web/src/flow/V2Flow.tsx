import { useEffect, useMemo, useRef, useState } from "react";
import { startSessie } from "../sessies/api";
import { fetchVocabulaire } from "../v2/api";
import {
  berekenRangschikking,
  geenDominanteHypothese,
  vergelijkRangschikking,
  verklaring,
  volgendeVraagSuggestie,
  WEGING_LABEL,
} from "../v2/ranking";
import type { Fase, HypotheseRanking, Lateraliteit, V2StartFocus, VocabulaireData } from "../v2/types";
import { RodeVlaggenPaneel } from "./RodeVlaggenPaneel";

interface Props {
  onTerug: () => void;
  /** Bidirectionele kennisbank-koppeling (§11.3 punt 5/§11.4 stap 6) — zie KeuzeScherm. */
  startFocus?: V2StartFocus | null;
  onOpenInKennisbank?: (id: string) => void;
}

/**
 * V2-flow ("Brede verkenning") — requirements §11.3 punt 1-5, §11.4 stap
 * 4-6. Symptoom-first intake + cross-hypothese rangschikking (stap 4);
 * "geen dominante hypothese" als eersteklas uitkomst + herweging-met-
 * verklaring (stap 5); bidirectionele kennisbank-koppeling (stap 6). De
 * rangschikkingslogica zelf staat in ../v2/ranking.ts (puur, client-side,
 * zelfde architectuurprincipe als V1's flow-reducer).
 */
export function V2Flow({ onTerug, startFocus, onOpenInKennisbank }: Props) {
  const [vocabulaire, setVocabulaire] = useState<VocabulaireData | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [sessieId, setSessieId] = useState<string | null>(null);
  // Bidirectionele kennisbank-koppeling: als binnengekomen via "start
  // reasoning-flow met dit als uitgangspunt" (§11.3 punt 5) én het object
  // een symptoom/anamnese-item uit dit vocabulaire is, alvast als "aanwezig"
  // voorinvullen — technisch goedkoop (V2-ontwerp §17), want de rangschikking
  // reageert toch al live op antwoorden. Voor andere objecttypes (test,
  // interventie, aandoening zelf, …) is er niets zinnigs om voor in te
  // vullen; die tonen alleen de banner hieronder.
  const [antwoorden, setAntwoorden] = useState<Record<string, boolean | undefined>>(
    startFocus ? { [startFocus.id]: true } : {}
  );
  const [fase, setFase] = useState<Fase>(null);
  const [lateraliteit, setLateraliteit] = useState<Lateraliteit>(null);
  const [herwegingLog, setHerwegingLog] = useState<string[]>([]);
  const rankingRef = useRef<HypotheseRanking[]>([]);

  const gestartRef = useRef(false);
  useEffect(() => {
    if (gestartRef.current) return;
    gestartRef.current = true;
    startSessie("v2")
      .then((s) => setSessieId(s.id))
      .catch(() => {
        /* best-effort, zelfde patroon als V1's sessie-start (ReasoningFlow.tsx) */
      });
    fetchVocabulaire("therapeut")
      .then(setVocabulaire)
      .catch((e) => setFout(String(e)));
  }, []);

  const ranking = useMemo(() => {
    if (!vocabulaire) return [];
    return berekenRangschikking(vocabulaire, antwoorden, fase, lateraliteit);
  }, [vocabulaire, antwoorden, fase, lateraliteit]);

  useEffect(() => {
    rankingRef.current = ranking;
  }, [ranking]);

  const suggestie = useMemo(() => {
    if (!vocabulaire || ranking.length === 0) return null;
    return volgendeVraagSuggestie(vocabulaire, ranking, antwoorden);
  }, [vocabulaire, ranking, antwoorden]);

  const geenDominant = ranking.length > 0 && geenDominanteHypothese(ranking);

  // Herweging-met-verklaring (§11.3 punt 4, V2-ontwerp §13): elke wijziging
  // wordt vóór het toepassen vergeleken met de rangschikking van net ervoor,
  // zodat de log kan verklaren *waarom* iets veranderde — niet alleen dát.
  function pasAanEnLog(
    nieuweAntwoorden: Record<string, boolean | undefined>,
    nieuweFase: Fase,
    nieuweLateraliteit: Lateraliteit,
    gewijzigdLabel: string
  ) {
    if (!vocabulaire) return;
    const nieuweRanking = berekenRangschikking(vocabulaire, nieuweAntwoorden, nieuweFase, nieuweLateraliteit);
    const wijzigingen = vergelijkRangschikking(rankingRef.current, nieuweRanking, gewijzigdLabel);
    if (wijzigingen.length > 0) setHerwegingLog((log) => [...wijzigingen, ...log]);
    setAntwoorden(nieuweAntwoorden);
    setFase(nieuweFase);
    setLateraliteit(nieuweLateraliteit);
  }

  function zetAntwoord(itemId: string, waarde: boolean, itemNaam: string) {
    pasAanEnLog({ ...antwoorden, [itemId]: waarde }, fase, lateraliteit, itemNaam);
  }
  function kiesFase(f: NonNullable<Fase>) {
    pasAanEnLog(antwoorden, fase === f ? null : f, lateraliteit, `Fase: ${f === "acuut" ? "Acuut" : "Chronisch"}`);
  }
  function kiesLateraliteit(l: NonNullable<Lateraliteit>) {
    pasAanEnLog(antwoorden, fase, lateraliteit === l ? null : l, `Lateraliteit: ${l === "unilateraal" ? "Unilateraal" : "Bilateraal"}`);
  }

  if (fout) return <p className="hint">{fout}</p>;
  if (!vocabulaire) return <p className="hint">Symptoomvocabulaire laden…</p>;

  return (
    <div className="flow-layout">
      <div className="flow-main">
        <section className="flow-step">
          <p className="eyebrow">Brede verkenning · V2 · Symptoom-first intake</p>
          <h2>Welke kenmerken zijn aanwezig?</h2>
          <p className="hint">
            Breed uitvragen, niet aandoening-first (§11.3 punt 1) — elk kenmerk hieronder werkt door
            in de rangschikking van alle vier hoofditems tegelijk, rechts.
          </p>
          {sessieId && <p className="hint">Sessie gestart (V2): {sessieId}</p>}
          {startFocus && (
            <p className="hint">
              Gestart vanuit kennisbank: <strong>{startFocus.naam}</strong>
              {antwoorden[startFocus.id] === true && " — alvast als aanwezig gemarkeerd hieronder."}
            </p>
          )}

          <div className="triage-opties" style={{ marginBottom: 14 }}>
            <div>
              <p className="eyebrow">Fase (indien bekend)</p>
              <div className="anamnese-buttons">
                {(["acuut", "chronisch"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={fase === f ? "chip-toggle active" : "chip-toggle"}
                    onClick={() => kiesFase(f)}
                  >
                    {f === "acuut" ? "Acuut" : "Chronisch"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Lateraliteit (indien bekend)</p>
              <div className="anamnese-buttons">
                {(["unilateraal", "bilateraal"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={lateraliteit === l ? "chip-toggle active" : "chip-toggle"}
                    onClick={() => kiesLateraliteit(l)}
                  >
                    {l === "unilateraal" ? "Unilateraal" : "Bilateraal"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {suggestie && (
            <p className="veiligheidshint" style={{ background: "var(--panel-bg)", color: "var(--text)" }}>
              <strong>Volgende-vraag-suggestie:</strong> de rangschikking loopt vast tussen de
              chronische hypothesen. Vraag door naar <em>{suggestie.naam}</em> — dit is een scherpe
              discriminator gebleken (V2-ontwerp §9).
            </p>
          )}

          {vocabulaire.categorieen.map((cat) => (
            <div key={cat.categorie}>
              <h3 className="trail-heading" style={{ fontSize: "0.9rem", marginTop: 18 }}>
                {cat.categorie}
              </h3>
              <ul className="anamnese-list">
                {cat.items.map((item) => (
                  <li key={item.id} className="anamnese-item">
                    <p>{item.naam}</p>
                    <div className="anamnese-buttons">
                      <button
                        type="button"
                        className={antwoorden[item.id] === true ? "chip-toggle active" : "chip-toggle"}
                        onClick={() => zetAntwoord(item.id, true, item.naam)}
                      >
                        Aanwezig
                      </button>
                      <button
                        type="button"
                        className={antwoorden[item.id] === false ? "chip-toggle active" : "chip-toggle"}
                        onClick={() => zetAntwoord(item.id, false, item.naam)}
                      >
                        Afwezig
                      </button>
                      {onOpenInKennisbank && (
                        <button type="button" className="link-button" onClick={() => onOpenInKennisbank(item.id)}>
                          → kennisbank
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button type="button" className="btn-secondary" onClick={onTerug}>
            ← Andere route kiezen
          </button>
        </section>
      </div>

      <aside className="hypothese-panel">
        <h3>Hypothesen (cross-hypothese rangschikking)</h3>

        {geenDominant && (
          <p className="geen-dominante-hint">
            <strong>Geen dominante hypothese.</strong> De huidige presentatie ondersteunt meerdere
            hypothesen ongeveer gelijk (of nog geen enkele voldoende) — dit is een volwaardige
            uitkomst, geen foutstatus (V2-ontwerp §14).{" "}
            {suggestie ? (
              <>
                Aanvullend onderzoek op <em>{suggestie.naam}</em> kan onderscheid maken.
              </>
            ) : (
              "Bevestig meer kenmerken hierboven om verder te onderscheiden."
            )}
          </p>
        )}

        <ul className="hypothese-list">
          {ranking.map((r) => (
            <li key={r.id} className={"hypothese-item weging-" + r.weging}>
              <div className="hypothese-head">
                <span className="hypothese-naam">{r.naam}</span>
                <span className={"badge weging-badge weging-" + r.weging}>{WEGING_LABEL[r.weging]}</span>
              </div>
              <p className="hint" style={{ marginTop: 6 }}>
                {verklaring(r)}
              </p>
              {onOpenInKennisbank && (
                <button type="button" className="link-button" onClick={() => onOpenInKennisbank(r.id)}>
                  → kennisbank
                </button>
              )}
            </li>
          ))}
        </ul>

        {herwegingLog.length > 0 && (
          <>
            <h3 className="trail-heading">Herweging</h3>
            <ul className="herweging-log">
              {herwegingLog.map((regel, i) => (
                <li key={i}>{regel}</li>
              ))}
            </ul>
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <RodeVlaggenPaneel rol="therapeut" />
        </div>
      </aside>
    </div>
  );
}
