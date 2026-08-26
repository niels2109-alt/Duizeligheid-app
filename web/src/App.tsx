import { useState } from "react";
import "./App.css";
import "./flow/flow.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthScreen } from "./auth/AuthScreen";
import { KennisbankModus } from "./components/KennisbankModus";
import { KeuzeScherm } from "./flow/KeuzeScherm";
import { SessiesOverzicht } from "./sessies/SessiesOverzicht";
import type { ObjectDetail } from "./types";
import type { V2StartFocus } from "./v2/types";

type Modus = "kennisbank" | "flow" | "sessies";

function AppShell() {
  const { therapeut, laden, uitloggen } = useAuth();
  const [modus, setModus] = useState<Modus>("flow");

  // Bidirectionele kennisbank-koppeling (requirements §11.3 punt 5/V2-
  // ontwerp §17, §11.4 stap 6) — Modus A ↔ Modus B wijzen al naar dezelfde
  // KnowledgeObject-tabel; dit is uitsluitend navigatie-state (welk object
  // moet meteen open staan bij binnenkomst), eenmalig geconsumeerd door de
  // ontvangende kant zodat latere, handmatige navigatie niet blijft
  // terugspringen. V1 (ReasoningFlow) blijft hier volledig buiten.
  const [kennisbankFocusId, setKennisbankFocusId] = useState<string | null>(null);
  const [v2StartFocus, setV2StartFocus] = useState<V2StartFocus | null>(null);

  if (laden) return <p className="hint" style={{ padding: 24 }}>Laden…</p>;
  if (!therapeut) return <AuthScreen />;

  function openInKennisbank(id: string) {
    setKennisbankFocusId(id);
    setModus("kennisbank");
  }

  function startFlowVanuitKennisbank(object: ObjectDetail) {
    setV2StartFocus({ id: object.id, naam: object.naam });
    setModus("flow");
  }

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <nav className="modus-tabs" role="tablist" aria-label="Modus">
          <button type="button" role="tab" aria-selected={modus === "flow"} className={modus === "flow" ? "active" : ""} onClick={() => setModus("flow")}>
            Modus A · Reasoning-flow
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modus === "kennisbank"}
            className={modus === "kennisbank" ? "active" : ""}
            onClick={() => setModus("kennisbank")}
          >
            Modus B · Kennisbank raadplegen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modus === "sessies"}
            className={modus === "sessies" ? "active" : ""}
            onClick={() => setModus("sessies")}
          >
            Mijn sessies
          </button>
        </nav>
        <div className="account-info">
          <span>{therapeut.email}</span>
          <button type="button" className="link-button" onClick={() => uitloggen()}>
            Uitloggen
          </button>
        </div>
      </div>

      {modus === "flow" && (
        <KeuzeScherm
          startFocus={v2StartFocus}
          onConsumedStartFocus={() => setV2StartFocus(null)}
          onOpenInKennisbank={openInKennisbank}
        />
      )}
      {modus === "kennisbank" && (
        <KennisbankModus
          focusId={kennisbankFocusId}
          onConsumedFocusId={() => setKennisbankFocusId(null)}
          onStartFlow={startFlowVanuitKennisbank}
        />
      )}
      {modus === "sessies" && <SessiesOverzicht />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
