import { useEffect, useState } from "react";
import type { V2StartFocus } from "../v2/types";
import { ReasoningFlow } from "./ReasoningFlow";
import { V2Flow } from "./V2Flow";

type Route = "keuze" | "v1" | "v2";

interface Props {
  /**
   * Bidirectionele kennisbank-koppeling (§11.3 punt 5/V2-ontwerp §17):
   * gezet vanuit Modus B ("start reasoning-flow met dit als uitgangspunt").
   * Springt direct naar de V2-route i.p.v. het keuzescherm te tonen —
   * eenmalig geconsumeerd, zie onConsumedStartFocus.
   */
  startFocus?: V2StartFocus | null;
  onConsumedStartFocus?: () => void;
  onOpenInKennisbank?: (id: string) => void;
}

/**
 * Keuzescherm — requirements §11.2. Toegangspunt van Modus A: de therapeut
 * kiest bij het starten van een nieuwe sessie tussen de bestaande V1-flow
 * ("Snelle route") en de nieuwe V2-flow ("Brede verkenning"). Geen technisch
 * detail maar een productbeslissing (§11.2): V2 vervangt V1 niet, het vult
 * het gat voor atypische/overlappende presentaties.
 *
 * Kiest de therapeut "Snelle route", dan rendert dit exact de bestaande,
 * ongewijzigde <ReasoningFlow /> — zelfde component, zelfde gedrag als vóór
 * §11. Er is bewust geen manier om via deze route toch bij V2 uit te komen
 * of andersom: de twee paden zijn en blijven volledig gescheiden — behalve
 * de expliciete, eenmalige binnenkomst via startFocus (stap 6), die altijd
 * naar V2 leidt, nooit naar V1.
 */
export function KeuzeScherm({ startFocus, onConsumedStartFocus, onOpenInKennisbank }: Props) {
  const [route, setRoute] = useState<Route>(startFocus ? "v2" : "keuze");
  // Momentopname bij mount: onConsumedStartFocus hieronder wist de prop bij
  // de OUDER meteen na de eerste render, wat anders op de VOLGENDE render
  // van dit component (nieuwe props, zelfde instantie) startFocus al naar
  // null zou hebben gezet vóórdat V2Flow 'm ooit te zien kreeg.
  const [startFocusSnapshot] = useState<V2StartFocus | null>(startFocus ?? null);

  useEffect(() => {
    if (startFocus) onConsumedStartFocus?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (route === "v1") return <ReasoningFlow />;
  if (route === "v2")
    return <V2Flow onTerug={() => setRoute("keuze")} startFocus={startFocusSnapshot} onOpenInKennisbank={onOpenInKennisbank} />;

  return (
    <div className="flow-layout">
      <div className="flow-main">
        <section className="flow-step">
          <p className="eyebrow">Nieuwe sessie</p>
          <h2>Hoe wil je deze sessie aanpakken?</h2>
          <p>
            Dit bepaalt welke flow-logica wordt gebruikt — geen van beide is "beter", het is een keuze
            per presentatie (requirements §11.2).
          </p>
          <div className="triage-opties">
            <button type="button" className="triage-card" onClick={() => setRoute("v1")}>
              <strong>Snelle route</strong>
              <span className="hint">
                De bestaande, uitgebreid geteste flow — voor herkenbare, klassieke presentaties
                (BPPD, vestibulaire hypofunctie, PPPD, multifactorieel/valrisico).
              </span>
            </button>
            <button type="button" className="triage-card" onClick={() => setRoute("v2")}>
              <strong>Brede verkenning</strong>
              <span className="hint">
                Voor atypische, overlappende of onduidelijke presentaties: symptoom-first intake met
                cross-hypothese-rangschikking over alle vier hoofditems tegelijk (in ontwikkeling — zie
                voortgang hieronder zodra gekozen).
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
