import type { Interrupt } from "./types";

interface Props {
  interrupt: Interrupt;
  onBevestig: () => void;
}

/**
 * Rode-vlag-interrupt — requirements §2.1 punt 5: "moet de normale
 * flow-voortgang geblokkeerd worden totdat de therapeut dit expliciet
 * heeft gezien/bevestigd — dit is een harde eis, geen dismissible melding."
 * Geen kruisje, geen klik-buiten-om-te-sluiten — alleen de bevestigingsknop
 * sluit dit venster.
 */
export function RedFlagModal({ interrupt, onBevestig }: Props) {
  return (
    <div className="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="rf-title">
      <div className="modal-card">
        <p className="modal-eyebrow">Rode vlag gedetecteerd</p>
        <h2 id="rf-title">{interrupt.bron}</h2>
        <p className="modal-interpretatie">{interrupt.interpretatie}</p>
        <p className="modal-actie">
          Geadviseerde actie: <strong>{interrupt.actietype.replace(/_/g, " ")}</strong>
        </p>
        <button type="button" className="btn-primary" onClick={onBevestig}>
          Gezien en bevestigd
        </button>
      </div>
    </div>
  );
}
