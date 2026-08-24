import type { FlowAction, FlowState } from "./types";
import { bouwHypothesen, trailEntry, zetWeging } from "./logic";

export const initialFlowState: FlowState = {
  flow: null,
  laden: true,
  fout: null,
  sessieId: null,
  stap: "triage",
  hypotheses: [],
  gekozenTriageId: null,
  interrupt: null,
  anamneseAntwoorden: {},
  gekozenTestId: null,
  gekozenBevindingRelatieId: null,
  bevestigdeKwalificatie: null,
  gekozenInterventieId: null,
  contraIndicatieAntwoorden: {},
  eduVrijgegeven: false,
  trail: [],
  followup: { vorigeInterventieId: null, uitkomst: null },
};

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "LADEN_START":
      return { ...state, laden: true, fout: null };

    case "LADEN_OK":
      return {
        ...state,
        laden: false,
        flow: action.flow,
        hypotheses: bouwHypothesen(action.flow),
      };

    case "LADEN_FOUT":
      return { ...state, laden: false, fout: action.fout };

    case "SESSIE_GESTART":
      return { ...state, sessieId: action.sessieId };

    case "KIES_TRIAGE": {
      if (!state.flow) return state;
      const isBppv = action.id === state.flow.aandoening.id;
      let hypotheses = state.hypotheses;
      if (isBppv) {
        hypotheses = zetWeging(
          hypotheses,
          state.flow.aandoening.id,
          "hoog",
          "Aanvalsgewijs, houdingsafhankelijk patroon past bij BPPV."
        );
        state.flow.differentialen.forEach((d) => {
          hypotheses = zetWeging(
            hypotheses,
            d.id,
            "laag",
            "Patroon paste niet bij het gerapporteerde triagekenmerk."
          );
        });
      } else {
        hypotheses = zetWeging(
          hypotheses,
          action.id,
          "hoog",
          "Patroon komt overeen met het gerapporteerde triagekenmerk."
        );
        hypotheses = zetWeging(
          hypotheses,
          state.flow.aandoening.id,
          "laag",
          "Patroon past niet bij BPPV's kenmerkende korte, houdingsgebonden aanvallen."
        );
      }
      const gekozen =
        state.flow.aandoening.id === action.id
          ? state.flow.aandoening.naam
          : state.flow.differentialen.find((d) => d.id === action.id)?.naam ?? action.id;
      return {
        ...state,
        gekozenTriageId: action.id,
        hypotheses,
        stap: isBppv ? "anamnese" : "dead-end",
        trail: [
          ...state.trail,
          trailEntry(
            "Triage",
            "triage",
            `Triagekenmerk gekozen: ${gekozen}.`,
            [action.id],
            isBppv ? state.flow.aandoening.evidenceNiveau : null
          ),
        ],
      };
    }

    case "TRIGGER_INTERRUPT":
      return { ...state, interrupt: action.interrupt };

    case "BEVESTIG_INTERRUPT":
      return state.interrupt ? { ...state, interrupt: { ...state.interrupt, bevestigd: true } } : state;

    case "NA_INTERRUPT_VERWEZEN":
      return {
        ...state,
        interrupt: null,
        stap: "verwezen",
        trail: [
          ...state.trail,
          // stapType: null — voegt geen nieuwe klinische bevinding toe naast
          // de anamnese-/test-entry die de rode vlag al triggerde (zie
          // types.ts), dus geen eigen StapLog-rij.
          trailEntry("Rode vlag", null, "Traject beëindigd: patiënt verwezen.", [], null),
        ],
      };

    case "NA_INTERRUPT_DOORGAAN":
      return {
        ...state,
        interrupt: null,
        trail: [
          ...state.trail,
          trailEntry("Rode vlag", null, "Therapeut kiest, op eigen klinisch oordeel, om door te gaan.", [], null),
        ],
      };

    case "ANAMNESE_ANTWOORD": {
      if (!state.flow) return state;
      const check = state.flow.anamneseChecks.find((c) => c.redFlagId === action.redFlagId);
      let hypotheses = state.hypotheses;
      let interrupt = state.interrupt;
      let trail = state.trail;
      if (check && action.aanwezig) {
        hypotheses = zetWeging(
          hypotheses,
          state.flow.aandoening.id,
          "laag",
          `${check.redFlagNaam}: ${check.interpretatie}`
        );
        trail = [
          ...trail,
          trailEntry(
            "Anamnese",
            "anamnese",
            `${check.bevinding} → ${check.interpretatie}`,
            [check.redFlagId],
            check.evidenceNiveau
          ),
        ];
        if (check.actietype === "acuut_verwijzen") {
          interrupt = {
            bron: `Anamnese: ${check.redFlagNaam}`,
            interpretatie: check.interpretatie ?? "",
            actietype: check.actietype,
            bevestigd: false,
          };
        }
      }
      return {
        ...state,
        anamneseAntwoorden: { ...state.anamneseAntwoorden, [action.redFlagId]: action.aanwezig },
        hypotheses,
        interrupt,
        trail,
      };
    }

    case "GA_NAAR_TESTSELECTIE":
      return { ...state, stap: "test-select" };

    case "KIES_TEST": {
      const test = state.flow?.testen.find((t) => t.id === action.testId);
      return {
        ...state,
        gekozenTestId: action.testId,
        trail: test
          ? [...state.trail, trailEntry("Testselectie", "test", `Gekozen test: ${test.naam}.`, [test.id], test.evidenceNiveau)]
          : state.trail,
      };
    }

    case "KIES_BEVINDING": {
      if (!state.flow || !state.gekozenTestId) return state;
      const test = state.flow.testen.find((t) => t.id === state.gekozenTestId);
      const bevinding = test?.bevindingen.find((b) => b.relatieId === action.relatieId);
      if (!test || !bevinding) return state;

      let hypotheses = state.hypotheses;
      let interrupt = state.interrupt;
      let bevestigdeKwalificatie = state.bevestigdeKwalificatie;
      const isNegatief = bevinding.kwalificatie?.resultaat === "negatief";

      if (bevinding.actietype === "acuut_verwijzen") {
        hypotheses = zetWeging(
          hypotheses,
          state.flow.aandoening.id,
          "laag",
          bevinding.interpretatie ?? ""
        );
        interrupt = {
          bron: `Test: ${test.naam}`,
          interpretatie: bevinding.interpretatie ?? "",
          actietype: bevinding.actietype,
          bevestigd: false,
        };
      } else if (isNegatief) {
        hypotheses = zetWeging(
          hypotheses,
          state.flow.aandoening.id,
          "laag",
          `${test.naam}: ${bevinding.interpretatie}`
        );
      } else if (bevinding.naarObjectId === state.flow.aandoening.id) {
        const weging = (bevinding.diagnostischeWaarde as "hoog" | "matig" | "laag" | null) ?? "matig";
        hypotheses = zetWeging(hypotheses, state.flow.aandoening.id, weging, `${test.naam}: ${bevinding.interpretatie}`);
        bevestigdeKwalificatie = bevinding.kwalificatie;
      }

      return {
        ...state,
        gekozenBevindingRelatieId: action.relatieId,
        hypotheses,
        interrupt,
        bevestigdeKwalificatie,
        stap: "test-interpretatie",
        trail: [
          ...state.trail,
          trailEntry(
            "Interpretatie",
            "interpretatie",
            `${bevinding.bevinding} → ${bevinding.interpretatie}`,
            [test.id, bevinding.naarObjectId],
            bevinding.evidenceNiveau
          ),
        ],
      };
    }

    case "TERUG_NAAR_TESTSELECTIE":
      return { ...state, gekozenTestId: null, gekozenBevindingRelatieId: null, stap: "test-select" };

    case "GA_NAAR_BEHANDELSTRATEGIE":
      return { ...state, stap: "behandelstrategie" };

    case "KIES_INTERVENTIE":
      return { ...state, gekozenInterventieId: action.interventieId, contraIndicatieAntwoorden: {} };

    case "CI_ANTWOORD":
      return {
        ...state,
        contraIndicatieAntwoorden: { ...state.contraIndicatieAntwoorden, [action.ciId]: action.aanwezig },
      };

    case "BEVESTIG_BEHANDELSTRATEGIE": {
      if (!state.flow || !state.gekozenInterventieId) return state;
      const interventie = state.flow.interventies.find((i) => i.id === state.gekozenInterventieId);
      const aanwezigeCis = interventie
        ? interventie.contraIndicaties.filter((ci) => state.contraIndicatieAntwoorden[ci.id])
        : [];
      return {
        ...state,
        stap: "educatie",
        trail: [
          ...state.trail,
          trailEntry(
            "Behandelstrategie",
            "strategie",
            `Gekozen interventie: ${interventie?.naam ?? state.gekozenInterventieId}.` +
              (aanwezigeCis.length > 0
                ? ` Aanwezige contra-indicaties: ${aanwezigeCis.map((c) => c.naam).join(", ")}.`
                : " Geen contra-indicaties aanwezig."),
            [state.gekozenInterventieId, ...aanwezigeCis.map((c) => c.id)],
            interventie?.evidenceNiveau ?? null
          ),
        ],
      };
    }

    case "VRIJGEVEN_EDUCATIE":
      return {
        ...state,
        eduVrijgegeven: true,
        trail: [
          ...state.trail,
          trailEntry(
            "Patiënteducatie",
            "educatie",
            "Educatie vrijgegeven aan patiënt.",
            state.flow?.educatie ? [state.flow.educatie.id] : [],
            null
          ),
        ],
      };

    case "AFRONDEN":
      return { ...state, stap: "afgerond" };

    case "START_FOLLOWUP":
      return {
        ...initialFlowState,
        flow: state.flow,
        laden: false,
        // sessieId bewust null: een vervolgconsult is een nieuwe Sessie
        // (referentiedocument §22 stap 7 is een eigen consult-moment) — het
        // omringende component merkt sessieId===null en start er één.
        hypotheses: state.flow ? bouwHypothesen(state.flow) : [],
        stap: "followup-entry",
      };

    case "FOLLOWUP_INTERVENTIE": {
      const interventie = state.flow?.interventies.find((i) => i.id === action.interventieId);
      return {
        ...state,
        followup: { ...state.followup, vorigeInterventieId: action.interventieId },
        stap: "followup-uitkomst",
        trail: [
          ...state.trail,
          trailEntry(
            "Follow-up",
            "followup",
            `Vervolgconsult — eerder toegepaste interventie: ${interventie?.naam ?? action.interventieId}.`,
            [action.interventieId],
            null
          ),
        ],
      };
    }

    case "FOLLOWUP_UITKOMST": {
      const followup = { ...state.followup, uitkomst: action.uitkomst };
      if (action.uitkomst === "kanaalconversie") {
        return {
          ...state,
          followup,
          gekozenTestId: null,
          gekozenBevindingRelatieId: null,
          bevestigdeKwalificatie: null,
          stap: "test-select",
          trail: [
            ...state.trail,
            trailEntry("Follow-up", "followup", "Kanaalconversie vermoed — terug naar testselectie.", [], null),
          ],
        };
      }
      return {
        ...state,
        followup,
        trail: [...state.trail, trailEntry("Follow-up", "followup", `Uitkomst: ${action.uitkomst}.`, [], null)],
      };
    }

    case "RESET":
      return {
        ...initialFlowState,
        flow: state.flow,
        laden: false,
        // sessieId bewust null — zie toelichting bij START_FOLLOWUP.
        hypotheses: state.flow ? bouwHypothesen(state.flow) : [],
      };

    default:
      return state;
  }
}
