import type { ObjectDetail, RelatieView } from "../types";
import { TYPE_LABELS } from "../types";

interface Props {
  object: ObjectDetail | null;
  loading: boolean;
  onNavigate: (id: string) => void;
}

function fmt(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function RelatieRow({
  relatie,
  richting,
  onNavigate,
}: {
  relatie: RelatieView;
  richting: "vanuit" | "naartoe";
  onNavigate: (id: string) => void;
}) {
  const targetId = richting === "vanuit" ? relatie.naarObjectId : relatie.vanObjectId;
  const targetNaam = richting === "vanuit" ? relatie.naarObjectNaam : relatie.vanObjectNaam;
  const targetType = richting === "vanuit" ? relatie.naarObjectType : relatie.vanObjectType;
  const isRedFlagTrigger = relatie.actietype === "acuut_verwijzen";

  return (
    <li className={isRedFlagTrigger ? "relatie-row red-flag" : "relatie-row"}>
      <div className="relatie-header">
        <span className="badge relatie-type-badge">{fmt(relatie.relatieType)}</span>
        {targetId && (
          <button type="button" className="link-button" onClick={() => onNavigate(targetId)}>
            {richting === "vanuit" ? "→" : "←"} {targetNaam}{" "}
            <span className="result-id">
              ({targetId}
              {targetType ? `, ${TYPE_LABELS[targetType]}` : ""})
            </span>
          </button>
        )}
        {relatie.actietype && (
          <span className={isRedFlagTrigger ? "badge actie-badge urgent" : "badge actie-badge"}>
            {fmt(relatie.actietype)}
          </span>
        )}
      </div>

      {relatie.kwalificatie && Object.keys(relatie.kwalificatie).length > 0 && (
        <div className="kwalificatie">
          {Object.entries(relatie.kwalificatie).map(([k, v]) => (
            <span key={k} className="kwalificatie-chip">
              {k}: {v}
            </span>
          ))}
        </div>
      )}

      {relatie.bevinding && (
        <p>
          <strong>Bevinding:</strong> {relatie.bevinding}
        </p>
      )}
      {relatie.interpretatie && (
        <p>
          <strong>Interpretatie:</strong> {relatie.interpretatie}
        </p>
      )}

      <div className="relatie-meta">
        {relatie.diagnostischeWaarde && (
          <span className="meta-chip">Diagnostische waarde: {fmt(relatie.diagnostischeWaarde)}</span>
        )}
        {relatie.relatietypeDifferentiaal && (
          <span className="meta-chip">{fmt(relatie.relatietypeDifferentiaal)}</span>
        )}
        {relatie.bijdrageGewicht && (
          <span className="meta-chip">Gewicht: {fmt(relatie.bijdrageGewicht)}</span>
        )}
        {relatie.patroonType && <span className="meta-chip">{fmt(relatie.patroonType)}</span>}
        {relatie.evidenceNiveau && (
          <span className="meta-chip evidence-chip">{fmt(relatie.evidenceNiveau)}</span>
        )}
      </div>
    </li>
  );
}

export function ObjectDetailPanel({ object, loading, onNavigate }: Props) {
  if (loading) {
    return (
      <div className="detail-panel">
        <p className="hint">Laden…</p>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="detail-panel">
        <p className="hint">
          Selecteer een object uit de resultaten om de volledige inhoud en relaties te bekijken.
        </p>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <span className="badge type-badge">{TYPE_LABELS[object.typeObject]}</span>
        {object.tier !== null && <span className="badge tier-badge">Tier {object.tier}</span>}
        <span className="badge evidence-badge">{fmt(object.evidenceNiveau)}</span>
        <span className="badge status-badge">{fmt(object.status)}</span>
      </div>
      <h2>
        {object.naam} <span className="result-id">({object.id})</span>
      </h2>

      <p className="kernbeschrijving">{object.kernbeschrijving}</p>

      {object.klinischeKenmerken && (
        <div className="detail-block">
          <h3>Klinische kenmerken</h3>
          <p>{object.klinischeKenmerken}</p>
        </div>
      )}

      {object.typeObject === "aandoening" && (
        <div className="detail-block">
          <h3>Classificatie</h3>
          <div className="kv-grid">
            <span>Behandelverantwoordelijkheid</span>
            <span>{fmt(object.behandelverantwoordelijkheid)}</span>
            <span>Behandeldiepte</span>
            <span>{fmt(object.behandeldiepte)}</span>
            <span>Uitkomsttype</span>
            <span>{fmt(object.uitkomsttype)}</span>
          </div>
        </div>
      )}

      {object.patientEducatie && (
        <div className="detail-block">
          <h3>Patiënteducatie</h3>
          <p>
            <strong>Verwachtingsmanagement:</strong> {object.patientEducatie.verwachtingsmanagement}
          </p>
          {object.patientEducatie.rationaleUitlegCounterintuitief && (
            <p>
              <strong>Rationale-uitleg:</strong>{" "}
              {object.patientEducatie.rationaleUitlegCounterintuitief}
            </p>
          )}
          <p className="hint">
            Samengesteld per patiënt: {object.patientEducatie.samengesteld ? "ja" : "nee"} · Bron-
            objecten: {object.patientEducatie.bronObjectIds.join(", ") || "—"} · Signalering:{" "}
            {object.patientEducatie.signaleringObjectIds.join(", ") || "—"}
          </p>
        </div>
      )}

      <div className="detail-block">
        <h3>Relaties vanuit dit object ({object.relatiesVanuit.length})</h3>
        {object.relatiesVanuit.length === 0 ? (
          <p className="hint">Geen.</p>
        ) : (
          <ul className="relatie-list">
            {object.relatiesVanuit.map((r) => (
              <RelatieRow key={r.id} relatie={r} richting="vanuit" onNavigate={onNavigate} />
            ))}
          </ul>
        )}
      </div>

      <div className="detail-block">
        <h3>Relaties naar dit object toe ({object.relatiesNaartoe.length})</h3>
        {object.relatiesNaartoe.length === 0 ? (
          <p className="hint">Geen.</p>
        ) : (
          <ul className="relatie-list">
            {object.relatiesNaartoe.map((r) => (
              <RelatieRow key={r.id} relatie={r} richting="naartoe" onNavigate={onNavigate} />
            ))}
          </ul>
        )}
      </div>

      <p className="hint footer-meta">
        Status: {fmt(object.status)} · Laatst gecontroleerd op:{" "}
        {new Date(object.laatstGecontroleerdOp).toLocaleDateString("nl-NL")}
      </p>
    </div>
  );
}
