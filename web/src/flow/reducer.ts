import type { FlowAction, FlowState } from "./types";
import { bouwHypothesen, effectieveDiagnostischeWaarde, trailEntry, zetWeging } from "./logic";

export const initialFlowState: FlowState = {
  flow: null,
  laden: true,
  fout: null,
  sessieId: null,
  stap: "triage",
  hypotheses: [],
  gekozenTriageId: null,
  interrupt: null,
  voorwaardeCheckPending: null,
  voorwaardenBevestigd: {},
  episodeId: null,
  anamneseAntwoorden: {},
  gekozenTestId: null,
  gekozenBevindingRelatieId: null,
  bevestigdeKwalificatie: null,
  hypotheseBevestigd: false,
  gekozenFase: null,
  gekozenInterventieId: null,
  contraIndicatieAntwoorden: {},
  eduVrijgegeven: false,
  trail: [],
  followup: {
    vorigeInterventieId: null,
    uitkomst: null,
    faseVoortgang: null,
    interventieEffect: null,
    npqScore: null,
    patroonType: null,
    notitie: null,
  },
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
      // Alleen de HUIDIGE bundel bevestigen, of een niet-volledig-uitgewerkte
      // (dead-end) differentiaal kiezen. Wisselen naar een ANDER, zelf ook
      // volledig item loopt via TRIAGE_WISSEL_* (zie ReasoningFlow.tsx) —
      // die roept deze case dus nooit aan met een volledig-uitgewerkt
      // ander-item-id.
      const isHuidigeAandoening = action.id === state.flow.aandoening.id;
      let hypotheses = state.hypotheses;
      if (isHuidigeAandoening) {
        hypotheses = zetWeging(
          hypotheses,
          state.flow.aandoening.id,
          "hoog",
          `Patroon komt overeen met het gerapporteerde triagekenmerk (${state.flow.aandoening.naam}).`
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
          "laag",
          `Nog niet volledig uitgewerkt in dit systeem — kan niet gewogen worden op basis van het triagekenmerk.`
        );
        hypotheses = zetWeging(
          hypotheses,
          state.flow.aandoening.id,
          "laag",
          `Patroon past niet bij het kenmerkende patroon van ${state.flow.aandoening.naam}.`
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
        stap: isHuidigeAandoening ? "anamnese" : "dead-end",
        trail: [
          ...state.trail,
          trailEntry(
            "Triage",
            "triage",
            `Triagekenmerk gekozen: ${gekozen}.`,
            [action.id],
            isHuidigeAandoening ? state.flow.aandoening.evidenceNiveau : null
          ),
        ],
      };
    }

    // Wisselen naar een ander, zelf ook volledig uitgewerkt item (bijv. van
    // BPPV naar vestibulaire hypofunctie) — requirements §7.4 stap 3.
    case "TRIAGE_WISSEL_START":
      return { ...state, laden: true, fout: null };

    case "TRIAGE_WISSEL_FOUT":
      return { ...state, laden: false, fout: action.fout };

    case "TRIAGE_WISSEL_OK": {
      const nieuweFlow = action.flow;
      let hypotheses = bouwHypothesen(nieuweFlow);
      hypotheses = zetWeging(
        hypotheses,
        nieuweFlow.aandoening.id,
        "hoog",
        `Patroon komt overeen met het gerapporteerde triagekenmerk (${nieuweFlow.aandoening.naam}).`
      );
      nieuweFlow.differentialen.forEach((d) => {
        hypotheses = zetWeging(
          hypotheses,
          d.id,
          "laag",
          "Patroon paste niet bij het gerapporteerde triagekenmerk."
        );
      });
      return {
        ...state,
        laden: false,
        flow: nieuweFlow,
        hypotheses,
        gekozenTriageId: nieuweFlow.aandoening.id,
        stap: "anamnese",
        trail: [
          ...state.trail,
          trailEntry(
            "Triage",
            "triage",
            `Triagekenmerk gekozen: ${nieuweFlow.aandoening.naam}.`,
            [nieuweFlow.aandoening.id],
            nieuweFlow.aandoening.evidenceNiveau
          ),
        ],
      };
    }

    // Requirements §8.1: harde gate vóór het wisselen naar een voorwaarde-
    // gated aandoening (bijv. PPPD) — de daadwerkelijke bundel-wissel loopt
    // pas ná bevestiging via TRIAGE_WISSEL_*, net als bij een ongated item.
    case "START_VOORWAARDE_CHECK":
      return {
        ...state,
        stap: "voorwaarde-check",
        voorwaardeCheckPending: { id: action.id, naam: action.naam, voorwaarde: action.voorwaarde },
      };

    case "BEVESTIG_VOORWAARDE":
      return {
        ...state,
        voorwaardenBevestigd: { ...state.voorwaardenBevestigd, [action.relatieId]: true },
        trail: [
          ...state.trail,
          trailEntry(
            "Voorwaarde",
            "anamnese",
            `Voorwaarde bevestigd: ${state.voorwaardeCheckPending?.voorwaarde.bevinding ?? ""}.`,
            [state.voorwaardeCheckPending?.voorwaarde.anamneseItemId ?? ""].filter(Boolean),
            null
          ),
        ],
      };

    case "ANNULEER_VOORWAARDE_CHECK":
      return { ...state, stap: "triage", voorwaardeCheckPending: null };

    // Requirements §8.4: structurele koppeling, geen trail-entry (vgl.
    // SESSIE_GESTART).
    case "EPISODE_GEKOZEN":
      return { ...state, episodeId: action.episodeId };

    case "KIES_FASE": {
      if (!state.flow) return state;
      return {
        ...state,
        gekozenFase: action.fase,
        trail: [
          ...state.trail,
          trailEntry(
            "Anamnese",
            "anamnese",
            // Requirements §7.1: fase wordt via samengestelde anamnese/
            // observatie bepaald, geen aparte test.
            `Fase vastgesteld (anamnese/observatie): ${action.fase}.`,
            [state.flow.aandoening.id],
            null
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
      let hypotheseBevestigd = state.hypotheseBevestigd;
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
        // Requirements §8.1: TEST-005's diagnostische waarde is conditioneel
        // (null + een verwijzing naar de voorwaarde-relatie) — nooit een
        // vaste waarde. effectieveDiagnostischeWaarde lost dit op aan de
        // hand van state.voorwaardenBevestigd; voor alle andere tests
        // (waar diagnostischeWaarde al vast staat) verandert dit niets.
        const weging =
          (effectieveDiagnostischeWaarde(bevinding, state.voorwaardenBevestigd) as "hoog" | "matig" | "laag" | null) ??
          "matig";
        hypotheses = zetWeging(hypotheses, state.flow.aandoening.id, weging, `${test.naam}: ${bevinding.interpretatie}`);
        bevestigdeKwalificatie = bevinding.kwalificatie;
        hypotheseBevestigd = true;
      }

      return {
        ...state,
        gekozenBevindingRelatieId: action.relatieId,
        hypotheses,
        interrupt,
        bevestigdeKwalificatie,
        hypotheseBevestigd,
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

    // Twee-lussen-follow-up (requirements §7.3) — losse acties per lus,
    // zodat ze onafhankelijk van elkaar kunnen afwijken en als aparte
    // trail-/StapLog-regels blijven staan (nooit samengevoegd tot één
    // goed/fout-oordeel).
    case "FOLLOWUP_FASE_VOORTGANG": {
      const tekst =
        action.waarde === "afwijkend"
          ? "Fase-voortgangslus: geen verwachte fase-voortgang, verslechtering of nieuwe neurologische symptomen — wijkt af van verwacht beloop."
          : action.waarde === "verwacht"
            ? "Fase-voortgangslus: verwachte voortgang, patiënt toe aan intensievere training."
            : "Fase-voortgangslus: nog niet toe aan intensievere training, huidige fase voortzetten.";
      return {
        ...state,
        followup: { ...state.followup, faseVoortgang: action.waarde },
        trail: [
          ...state.trail,
          trailEntry("Follow-up", "followup", tekst, action.waarde === "afwijkend" ? ["RF-008"] : [], null),
        ],
      };
    }

    case "FOLLOWUP_INTERVENTIE_EFFECT": {
      const tekst =
        action.waarde === "effectief"
          ? "Interventie-effectiviteitslus: merkbare verbetering (bijv. DVA-hermeting)."
          : "Interventie-effectiviteitslus: onvoldoende effect.";
      return {
        ...state,
        followup: { ...state.followup, interventieEffect: action.waarde },
        trail: [...state.trail, trailEntry("Follow-up", "followup", tekst, [], null)],
      };
    }

    // Requirements §8.5 stap 4: trendmatige follow-up (i.p.v. binair of
    // twee-lussen) — één invoer-actie, net als FOLLOWUP_INTERVENTIE_EFFECT
    // schrijft dit één trail-entry met de volledige klinische inhoud als
    // vrije tekst (geen los NPQ-score-schemaveld, zie episodes.ts).
    case "FOLLOWUP_TREND_INVOER": {
      const patroonLabel = action.patroonType === "verwachte_fluctuatie" ? "Verwachte fluctuatie" : "Afwijkend beloop";
      const tekst =
        `NPQ-score: ${action.npqScore}. Patroon: ${patroonLabel}.` +
        (action.notitie ? ` Notitie: ${action.notitie}` : "");
      return {
        ...state,
        followup: {
          ...state.followup,
          npqScore: action.npqScore,
          patroonType: action.patroonType,
          notitie: action.notitie,
        },
        trail: [
          ...state.trail,
          trailEntry("Follow-up", "followup", tekst, action.patroonType === "afwijkend_beloop" ? ["RF-010", "RF-011"] : [], null),
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
