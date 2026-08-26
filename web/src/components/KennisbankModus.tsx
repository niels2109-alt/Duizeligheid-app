import { useEffect, useMemo, useState } from "react";
import { fetchMeta, fetchObjectDetail, searchObjects } from "../api";
import { SearchFilters } from "./SearchFilters";
import { ResultsList } from "./ResultsList";
import { ObjectDetailPanel } from "./ObjectDetailPanel";
import { VraagPaneel } from "../ai/VraagPaneel";
import type { ObjectDetail, ObjectSummary, Rol, TypeObject } from "../types";

interface Props {
  /**
   * Bidirectionele kennisbank-koppeling (§11.3 punt 5/V2-ontwerp §17):
   * gezet vanuit Modus A (V2Flow) na een "→ kennisbank"-klik. Eenmalig
   * geconsumeerd (zie onConsumedFocusId) zodat een latere, handmatige
   * navigatie binnen Modus B niet steeds terugspringt naar dit object.
   */
  focusId?: string | null;
  onConsumedFocusId?: () => void;
  onStartFlow?: (object: ObjectDetail) => void;
}

export function KennisbankModus({ focusId, onConsumedFocusId, onStartFlow }: Props) {
  const [rol, setRol] = useState<Rol>("therapeut");
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<TypeObject[]>([]);
  const [tiers, setTiers] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TypeObject[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | undefined>(undefined);

  const [resultaten, setResultaten] = useState<ObjectSummary[]>([]);
  const [loadingResultaten, setLoadingResultaten] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null);
  const [detail, setDetail] = useState<ObjectDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eenmalige "focus"-navigatie vanuit V2Flow consumeren (zie Props hierboven).
  useEffect(() => {
    if (focusId) onConsumedFocusId?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filterwaarden eenmalig ophalen.
  useEffect(() => {
    fetchMeta()
      .then((meta) => {
        setTypes(meta.types);
        setTiers(meta.tiers);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Zoeken/filteren — bij elke wijziging opnieuw (Modus B is puur raadplegen,
  // geen sessie/logging, dus een simpele "elke wijziging = nieuwe query" volstaat).
  useEffect(() => {
    setLoadingResultaten(true);
    const timeout = setTimeout(() => {
      searchObjects({ rol, q, types: selectedTypes, tier: selectedTier })
        .then((res) => {
          setResultaten(res.resultaten);
          setError(null);
        })
        .catch((e) => setError(String(e)))
        .finally(() => setLoadingResultaten(false));
    }, 200); // lichte debounce op vrije tekst
    return () => clearTimeout(timeout);
  }, [rol, q, selectedTypes, selectedTier]);

  // Bij rolwissel: de selectie kan niet meer zichtbaar zijn — opnieuw ophalen
  // (en het detailpaneel valt vanzelf terug op "niet gevonden" als dat zo is).
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetchObjectDetail(selectedId, rol)
      .then((d) => {
        setDetail(d);
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingDetail(false));
  }, [selectedId, rol]);

  const rolUitleg = useMemo(
    () =>
      rol === "patient"
        ? "Toont alleen objecten met zichtbaar_patient = true (o.a. geen Tier 3, geen contra-indicaties/clinical pearls)."
        : "Toont alle objecten met zichtbaar_therapeut = true (vrijwel de volledige kennisbank).",
    [rol]
  );

  return (
    <div>
      <header className="app-header">
        <h1>Duizeligheid — Kennisbank (Modus B)</h1>
        <p className="hint">
          Zoek-/filterinterface over de gevulde BPPD-content — los van elke reasoning-flow, puur
          raadplegen. {rolUitleg}
        </p>
      </header>

      {error && <p className="error">{error}</p>}

      <VraagPaneel rol={rol} />

      <SearchFilters
        rol={rol}
        onRolChange={(r) => {
          setRol(r);
        }}
        q={q}
        onQChange={setQ}
        types={types}
        selectedTypes={selectedTypes}
        onSelectedTypesChange={setSelectedTypes}
        tiers={tiers}
        selectedTier={selectedTier}
        onSelectedTierChange={setSelectedTier}
      />

      <main className="main-layout">
        <section className="results-section">
          <p className="hint">{resultaten.length} resultaat/resultaten</p>
          <ResultsList
            resultaten={resultaten}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loadingResultaten}
          />
        </section>
        <section className="detail-section">
          <ObjectDetailPanel
            object={detail}
            loading={loadingDetail}
            onNavigate={setSelectedId}
            onStartFlow={onStartFlow}
          />
        </section>
      </main>
    </div>
  );
}
