import type { ObjectSummary } from "../types";
import { TYPE_LABELS } from "../types";

interface Props {
  resultaten: ObjectSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function ResultsList({ resultaten, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return <p className="hint">Laden…</p>;
  }

  if (resultaten.length === 0) {
    return <p className="hint">Geen resultaten voor deze zoekopdracht/filters.</p>;
  }

  return (
    <ul className="results-list">
      {resultaten.map((obj) => (
        <li key={obj.id}>
          <button
            type="button"
            className={obj.id === selectedId ? "result-card active" : "result-card"}
            onClick={() => onSelect(obj.id)}
          >
            <div className="result-card-header">
              <span className="badge type-badge">{TYPE_LABELS[obj.typeObject]}</span>
              {obj.tier !== null && <span className="badge tier-badge">Tier {obj.tier}</span>}
              <span className="badge evidence-badge">{obj.evidenceNiveau.replace(/_/g, " ")}</span>
            </div>
            <div className="result-card-title">
              {obj.naam} <span className="result-id">({obj.id})</span>
            </div>
            <p className="result-snippet">{obj.kernbeschrijving}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
