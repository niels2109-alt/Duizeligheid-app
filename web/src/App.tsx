import { useState } from "react";
import "./App.css";
import "./flow/flow.css";
import { KennisbankModus } from "./components/KennisbankModus";
import { ReasoningFlow } from "./flow/ReasoningFlow";

type Modus = "kennisbank" | "flow";

export default function App() {
  const [modus, setModus] = useState<Modus>("flow");

  return (
    <div className="app-shell">
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
      </nav>

      {modus === "flow" ? <ReasoningFlow /> : <KennisbankModus />}
    </div>
  );
}
