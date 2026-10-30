import type { ObjectDetail, RelatieView } from "../types";
import { TYPE_LABELS } from "../types";
import { naarBPPD, naarZinnen } from "./weergave";

interface Props {
  object: ObjectDetail | null;
  loading: boolean;
  onNavigate: (id: string) => void;
  /**
   * Bidirectionele kennisbank-koppeling — requirements §11.3 punt 5/V2-
   * ontwerp §17: vanuit een kennisbankpagina de reasoning-flow (V2) starten
   * met dit object als uitgangspunt. Optioneel: V1's bestaande gebruik van
   * dit paneel (ook al vanuit Modus B bereikbaar) blijft ongewijzigd
   * werken zonder deze prop mee te geven.
   */
  onStartFlow?: (object: ObjectDetail) => void;
}

function fmt(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

/**
 * Korte, begrijpelijke toelichting per relatie: niet de kale data, maar
 * wat de gebruiker hier ziet en waarom dat relevant is — afgeleid van het
 * relatietype en de bijbehorende velden, dus altijd gegrond in de data
 * zelf (geen vrije invulling).
 */
function relatieUitleg(
  relatie: RelatieView,
  richting: "vanuit" | "naartoe",
  targetNaam: string | undefined
): string {
  const naam = targetNaam ? naarBPPD(targetNaam) : "dit onderwerp";
  const isRedFlagTrigger = relatie.actietype === "acuut_verwijzen";

  switch (relatie.relatieType) {
    case "bevinding_interpretatie": {
      if (isRedFlagTrigger) {
        return `Dit is een rode vlag: deze bevinding wijst op ${naam} en vraagt om ${fmt(
          relatie.actietype
        )} — niet verder redeneren, maar doorverwijzen.`;
      }
      const waarde = relatie.diagnostischeWaarde
        ? ` (diagnostische waarde: ${fmt(relatie.diagnostischeWaarde)})`
        : "";
      return richting === "vanuit"
        ? `Dit laat zien hoe een bevinding hier moet worden geïnterpreteerd: ze wijst op ${naam}${waarde}.`
        : `Dit laat zien welke bevinding bij ${naam} tot deze interpretatie leidt${waarde}.`;
    }
    case "voorwaarde":
      return richting === "vanuit"
        ? `Dit geldt als voorwaarde voor ${naam} — bijvoorbeeld een contra-indicatie die eerst uitgesloten moet worden voordat dit wordt toegepast.`
        : `${naam} is hier een voorwaarde — bijvoorbeeld een contra-indicatie die eerst uitgesloten moet worden.`;
    case "aggregatie":
      return `Dit is samengevoegd met ${naam} tot één geheel — bijvoorbeeld voor een overzichtelijke, samengestelde patiëntuitleg.`;
    case "signalering_opvolging": {
      const actie = relatie.actietype ? ` (${fmt(relatie.actietype)})` : "";
      return richting === "vanuit"
        ? `Dit signaal vraagt om een vervolgactie richting ${naam}${actie}.`
        : `${naam} is het signaal dat hier tot een vervolgactie${actie} leidt.`;
    }
    case "differentiaal": {
      const aard =
        relatie.relatietypeDifferentiaal === "uitsluitend"
          ? "sluiten elkaar wederzijds uit"
          : relatie.relatietypeDifferentiaal === "comorbide"
            ? "kunnen tegelijk voorkomen (comorbide)"
            : "moeten tegen elkaar worden afgewogen";
      return `${naam} is een alternatieve verklaring om te overwegen — deze twee ${aard}.`;
    }
    default:
      return "";
  }
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
            {richting === "vanuit" ? "→" : "←"} {naarBPPD(targetNaam ?? "")}
            {targetType && <span className="relatie-target-type"> ({TYPE_LABELS[targetType]})</span>}
          </button>
        )}
        {relatie.actietype && (
          <span className={isRedFlagTrigger ? "badge actie-badge urgent" : "badge actie-badge"}>
            {fmt(relatie.actietype)}
          </span>
        )}
      </div>

      <p className="relatie-uitleg">{relatieUitleg(relatie, richting, targetNaam)}</p>

      {relatie.kwalificatie && Object.keys(relatie.kwalificatie).length > 0 && (
        <div className="kwalificatie">
          {Object.entries(relatie.kwalificatie).map(([k, v]) => (
            <span key={k} className="kwalificatie-chip">
              {k}: {naarBPPD(String(v))}
            </span>
          ))}
        </div>
      )}

      {relatie.bevinding && (
        <p>
          <strong>Bevinding:</strong> {naarBPPD(relatie.bevinding)}
        </p>
      )}
      {relatie.interpretatie && (
        <p>
          <strong>Interpretatie:</strong> {naarBPPD(relatie.interpretatie)}
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

function RelatiesBlok({
  titel,
  relaties,
  richting,
  onNavigate,
}: {
  titel: string;
  relaties: RelatieView[];
  richting: "vanuit" | "naartoe";
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="detail-block">
      <h3>
        {titel} ({relaties.length})
      </h3>
      {relaties.length === 0 ? (
        <p className="hint">Geen.</p>
      ) : (
        <details className="relatie-details">
          <summary>Toon relaties</summary>
          <ul className="relatie-list">
            {relaties.map((r) => (
              <RelatieRow key={r.id} relatie={r} richting={richting} onNavigate={onNavigate} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function ObjectDetailPanel({ object, loading, onNavigate, onStartFlow }: Props) {
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
      <h2>{naarBPPD(object.naam)}</h2>

      {onStartFlow && (
        <button type="button" className="link-button" onClick={() => onStartFlow(object)}>
          → Start reasoning-flow (Brede verkenning) met dit als uitgangspunt
        </button>
      )}

      <p className="kernbeschrijving">{naarBPPD(object.kernbeschrijving)}</p>

      {object.klinischeKenmerken && (
        <div className="detail-block">
          <h3>Klinische kenmerken</h3>
          <ul className="kenmerken-list">
            {naarZinnen(naarBPPD(object.klinischeKenmerken)).map((zin, i) => (
              <li key={i}>{zin}</li>
            ))}
          </ul>
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
            <strong>Verwachtingsmanagement:</strong>{" "}
            {naarBPPD(object.patientEducatie.verwachtingsmanagement)}
          </p>
          {object.patientEducatie.rationaleUitlegCounterintuitief && (
            <p>
              <strong>Rationale-uitleg:</strong>{" "}
              {naarBPPD(object.patientEducatie.rationaleUitlegCounterintuitief)}
            </p>
          )}
          <p className="hint">
            Samengesteld per patiënt: {object.patientEducatie.samengesteld ? "ja" : "nee"}
            {object.patientEducatie.bronObjectIds.length > 0 &&
              ` · Gebaseerd op ${object.patientEducatie.bronObjectIds.length} bronobject(en)`}
            {object.patientEducatie.signaleringObjectIds.length > 0 &&
              ` · Signalering vanuit ${object.patientEducatie.signaleringObjectIds.length} object(en)`}
          </p>
        </div>
      )}

      <RelatiesBlok
        titel="Relaties vanuit dit onderwerp"
        relaties={object.relatiesVanuit}
        richting="vanuit"
        onNavigate={onNavigate}
      />

      <RelatiesBlok
        titel="Relaties naar dit object toe"
        relaties={object.relatiesNaartoe}
        richting="naartoe"
        onNavigate={onNavigate}
      />

      <p className="hint footer-meta">
        Status: {fmt(object.status)} · Laatst gecontroleerd op:{" "}
        {new Date(object.laatstGecontroleerdOp).toLocaleDateString("nl-NL")}
      </p>
    </div>
  );
}
