import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchMeta, fetchObjectDetail, searchObjects } from "./api";
import { SearchFilters } from "./components/SearchFilters";
import { ResultsList } from "./components/ResultsList";
import { ObjectDetailPanel } from "./components/ObjectDetailPanel";
import type { ObjectDetail, ObjectSummary, Rol, TypeObject } from "./types";

export default function App() {
  const [rol, setRol] = useState<Rol>("therapeut");
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<TypeObject[]>([]);
  const [tiers, setTiers] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TypeObject[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | undefined>(undefined);

  const [resultaten, setResultaten] = useState<ObjectSummary[]>([]);
  const [loadingResultaten, setLoadingResultaten] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ObjectDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="app-shell">
      <header className="app-header">
        <h1>Duizeligheid — Kennisbank (Modus B)</h1>
        <p className="hint">
          Zoek-/filterinterface over de gevulde BPPV-content — los van elke reasoning-flow, puur
          raadplegen. {rolUitleg}
        </p>
      </header>

      {error && <p className="error">{error}</p>}

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
          <ObjectDetailPanel object={detail} loading={loadingDetail} onNavigate={setSelectedId} />
        </section>
      </main>
    </div>
  );
}
