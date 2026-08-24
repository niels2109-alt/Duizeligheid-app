import type { Rol, TypeObject } from "../types";
import { TYPE_LABELS } from "../types";

interface Props {
  rol: Rol;
  onRolChange: (rol: Rol) => void;
  q: string;
  onQChange: (q: string) => void;
  types: TypeObject[];
  selectedTypes: TypeObject[];
  onSelectedTypesChange: (types: TypeObject[]) => void;
  tiers: number[];
  selectedTier: number | undefined;
  onSelectedTierChange: (tier: number | undefined) => void;
}

export function SearchFilters({
  rol,
  onRolChange,
  q,
  onQChange,
  types,
  selectedTypes,
  onSelectedTypesChange,
  tiers,
  selectedTier,
  onSelectedTierChange,
}: Props) {
  function toggleType(type: TypeObject) {
    if (selectedTypes.includes(type)) {
      onSelectedTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onSelectedTypesChange([...selectedTypes, type]);
    }
  }

  return (
    <div className="filters">
      <div className="filters-row">
        <input
          className="search-input"
          type="search"
          placeholder="Zoek op naam of inhoud (bijv. 'Epley', 'nystagmus')…"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
        />

        <div className="rol-switch" role="radiogroup" aria-label="Weergaverol">
          <button
            type="button"
            className={rol === "therapeut" ? "active" : ""}
            onClick={() => onRolChange("therapeut")}
          >
            Therapeut-weergave
          </button>
          <button
            type="button"
            className={rol === "patient" ? "active" : ""}
            onClick={() => onRolChange("patient")}
          >
            Patiënt-weergave
          </button>
        </div>
      </div>

      <div className="filters-row">
        <div className="tier-filter">
          <span className="filter-label">Tier:</span>
          <button
            type="button"
            className={selectedTier === undefined ? "active" : ""}
            onClick={() => onSelectedTierChange(undefined)}
          >
            Alle
          </button>
          {tiers.map((tier) => (
            <button
              key={tier}
              type="button"
              className={selectedTier === tier ? "active" : ""}
              onClick={() => onSelectedTierChange(tier)}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="type-filter">
        {types.map((type) => (
          <label key={type} className="type-chip">
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={() => toggleType(type)}
            />
            {TYPE_LABELS[type]}
          </label>
        ))}
      </div>
    </div>
  );
}
