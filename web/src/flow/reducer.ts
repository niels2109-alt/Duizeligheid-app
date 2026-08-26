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
  factorAntwoorden: {},
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
    signaleringAntwoorden: {},
    factorVoortgang: {},
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

    // Requirements §10.1: bij uitkomsttype=samengesteld vervangt de factor-
    // screening-stap de test-select-stap — fase 1/2 (triage/anamnese)
    // blijven ongewijzigd (§19: "flow-fasen zelf ongewijzigd"), alleen fase
    // 3 vertakt hier voor het eerst op uitkomsttype.
    case "GA_NAAR_TESTSELECTIE":
      return { ...state, stap: state.flow?.aandoening.uitkomsttype === "samengesteld" ? "factor-screening" : "test-select" };

    // Requirements §10.1: NOOIT een stap-overgang hier — dit is precies het
    // verschil met KIES_BEVINDING (dat wél naar test-interpretatie
    // springt): de flow moet doorscreenen tot alle factoren beantwoord
    // zijn, niet stoppen bij de eerste bevestigde.
    case "FACTOR_ANTWOORD": {
      if (!state.flow) return state;
      const factor = state.flow.factoren.find((f) => f.id === action.factorId);
      let trail = state.trail;
      if (factor && action.aanwezig) {
        trail = [
          ...trail,
          trailEntry(
            "Factorenscreening",
            "test",
            `${factor.bevinding ?? factor.naam} (bijdrage: ${factor.bijdrageGewicht}).`,
            [factor.id],
            null
          ),
        ];
      }
      return {
        ...state,
        factorAntwoorden: { ...state.factorAntwoorden, [action.factorId]: action.aanwezig },
        trail,
      };
    }

    case "GA_NAAR_FACTOR_OVERZICHT": {
      if (!state.flow) return state;
      const bevestigd = state.flow.factoren.filter((f) =>
        f.viaAnamnese ? state.anamneseAntwoorden[f.id] === true : state.factorAntwoorden[f.id] === true
      );
      return {
        ...state,
        stap: "factor-overzicht",
        trail: [
          ...state.trail,
          trailEntry(
            "Factorenoverzicht",
            "interpretatie",
            bevestigd.length > 0
              ? `Bevestigd factorenprofiel (${bevestigd.length}): ${bevestigd.map((f) => f.naam).join(", ")}.`
              : "Geen van de gescreende factoren bevestigd.",
            bevestigd.map((f) => f.id),
            null
          ),
        ],
      };
    }

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

    // Requirements §10.1: alleen gebruikt door de samengesteld-tak —
    // factor-overzicht IS al de fase-4/5-output, geen aparte
    // contra-indicatie-/interventiekeuze-stap zoals bij enkelvoudige items.
    case "GA_NAAR_EDUCATIE":
      return { ...state, stap: "educatie" };

    // Requirements §10.2: "ja/nee/nog niet" per extern-behandelde factor —
    // geen automatische test/hertest. Elke keuze is zijn eigen trail-entry
    // (zelfde patroon als de andere follow-up-lussen: nooit samengevoegd
    // tot één oordeel).
    case "SIGNALERING_ANTWOORD": {
      const factor = state.flow?.factoren.find((f) => f.id === action.factorId);
      const label = action.waarde === "ja" ? "gebeurd" : action.waarde === "nee" ? "niet gebeurd" : "nog niet gebeurd";
      const tekst = `${factor?.signalering?.interpretatie ?? factor?.naam ?? action.factorId} — ${label}.`;
      return {
        ...state,
        followup: {
          ...state.followup,
          signaleringAntwoorden: { ...state.followup.signaleringAntwoorden, [action.factorId]: action.waarde },
        },
        trail: [...state.trail, trailEntry("Follow-up", "followup", tekst, [action.factorId], null)],
      };
    }

    // Requirements §10.3: patroon_type (uit PPPD, §18 generiek) hier op
    // per-factor-niveau — verwachte fluctuatie/afwijkend beloop per
    // fysio-behandelde factor, los van de andere factoren (nooit
    // samengevoegd tot één oordeel, zelfde principe als de andere
    // follow-up-lussen).
    case "FACTOR_VOORTGANG": {
      const factor = state.flow?.factoren.find((f) => f.id === action.factorId);
      const label = action.waarde === "verwachte_fluctuatie" ? "verwachte fluctuatie" : "afwijkend beloop";
      const tekst = `${factor?.naam ?? action.factorId} — beloop: ${label}.`;
      return {
        ...state,
        followup: {
          ...state.followup,
          factorVoortgang: { ...state.followup.factorVoortgang, [action.factorId]: action.waarde },
        },
        trail: [
          ...state.trail,
          trailEntry("Follow-up", "followup", tekst, action.waarde === "afwijkend_beloop" ? ["RF-013"] : [action.factorId], null),
        ],
      };
    }

    case "AFRONDEN_FACTOREN_FOLLOWUP":
      return { ...state, stap: "followup-uitkomst" };

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
