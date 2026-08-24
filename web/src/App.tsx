import { useState } from "react";
import "./App.css";
import "./flow/flow.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthScreen } from "./auth/AuthScreen";
import { KennisbankModus } from "./components/KennisbankModus";
import { ReasoningFlow } from "./flow/ReasoningFlow";
import { SessiesOverzicht } from "./sessies/SessiesOverzicht";

type Modus = "kennisbank" | "flow" | "sessies";

function AppShell() {
  const { therapeut, laden, uitloggen } = useAuth();
  const [modus, setModus] = useState<Modus>("flow");

  if (laden) return <p className="hint" style={{ padding: 24 }}>Laden…</p>;
  if (!therapeut) return <AuthScreen />;

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

      {modus === "flow" && <ReasoningFlow />}
      {modus === "kennisbank" && <KennisbankModus />}
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
