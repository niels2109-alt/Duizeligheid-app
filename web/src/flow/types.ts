// Spiegelt de respons van GET /api/flow/bppv (server/src/flow.ts).

export interface FlowVoorwaarde {
  relatieId: string;
  anamneseItemId: string;
  anamneseItemNaam: string;
  bevinding: string | null;
  interpretatie: string | null;
}

export interface FlowDifferentiaal {
  id: string;
  naam: string;
  tier: number | null;
  status: string;
  kenmerk: string | null;
  relatietypeDifferentiaal: string | null;
  volledigUitgewerkt: boolean;
  /// Requirements §8.1: gezet als deze differentiaal pas als hypothese mag
  /// worden getoond/gekozen nadat aan een voorwaarde is voldaan (bijv. PPPD)
  /// — null als er geen voorwaarde-gate op dit item zit.
  voorwaarde: FlowVoorwaarde | null;
}

export interface FlowAnamneseCheck {
  relatieId: string;
  redFlagId: string;
  redFlagNaam: string;
  bevinding: string | null;
  interpretatie: string | null;
  actietype: string | null;
  evidenceNiveau: string | null;
}

export interface FlowTestBevinding {
  relatieId: string;
  naarObjectId: string;
  naarObjectType: string;
  kwalificatie: Record<string, string> | null;
  bevinding: string | null;
  interpretatie: string | null;
  diagnostischeWaarde: string | null;
  /// Requirements §8.1 (TEST-005/Bárány-criteria): conditionele
  /// diagnostische waarde — als dit gezet is, is diagnostischeWaarde
  /// hierboven null, en wordt de effectieve waarde client-side opgelost via
  /// de voorwaardenBevestigd-state (zie logic.ts, effectieveDiagnostischeWaarde).
  diagnostischeWaardeVoorwaardeRelatieId: string | null;
  actietype: string | null;
  evidenceNiveau: string | null;
}

export interface FlowTest {
  id: string;
  naam: string;
  kernbeschrijving: string;
  evidenceNiveau: string;
  bevindingen: FlowTestBevinding[];
}

export interface FlowContraIndicatie {
  id: string;
  naam: string;
  kernbeschrijving: string;
  interpretatie: string | null;
}

export interface FlowInterventie {
  id: string;
  naam: string;
  kernbeschrijving: string;
  evidenceNiveau: string;
  // Meervoud (requirements §7.1): een interventie kan meerdere, los
  // gekwalificeerde indicatie-relaties hebben (bijv. INT-006 bij zowel
  // fase=acuut als fase=chronisch-compensatie) — bij BPPV is dit array
  // altijd hooguit 1 element lang, dat gedrag is ongewijzigd.
  indicatieKwalificaties: Array<Record<string, string> | null>;
  contraIndicaties: FlowContraIndicatie[];
}

export interface FlowEducatie {
  id: string;
  naam: string;
  kernbeschrijving: string;
  verwachtingsmanagement: string;
  rationaleUitlegCounterintuitief: string | null;
  signaleringObjectIds: string[];
}

export interface FlowData {
  aandoening: {
    id: string;
    naam: string;
    kernbeschrijving: string;
    klinischeKenmerken: string | null;
    uitkomsttype: string | null;
    tier: number | null;
    evidenceNiveau: string;
    /// Bijvangst §8.5 stap 4: als deze aandoening zelf een voorwaarde-gated
    /// item is, moet de PRIMAIRE triagekaart (kiesTriage in ReasoningFlow.tsx)
    /// dezelfde gate afdwingen als een differentiaal-keuze — anders omzeilt
    /// een nieuwe sessie op een al geladen bundel de bevestiging (§8.1).
    voorwaarde: FlowVoorwaarde | null;
    /// Requirements §8.4: datagedreven afgeleid (heeft dit object een
    /// inkomende voorwaarde-relatie?) — bepaalt of het follow-up-consult
    /// (§7) de trendmatige episode-variant gebruikt i.p.v. de binaire of
    /// twee-lussen-variant. Zie flow.ts voor de afleiding.
    vereistEpisodeTrend: boolean;
  };
  differentialen: FlowDifferentiaal[];
  anamneseChecks: FlowAnamneseCheck[];
  testen: FlowTest[];
  interventies: FlowInterventie[];
  educatie: FlowEducatie | null;
}

// --- Interne flow-state (client-side, geen persistentie in deze bouwstap —
// dat komt bij stap 4 met de Sessie-entiteit) -------------------------------

export type HypotheseWeging = "hoog" | "matig" | "laag" | "uitgesloten";

export interface HypotheseState {
  id: string;
  naam: string;
  weging: HypotheseWeging;
  redenen: string[];
  volledigUitgewerkt: boolean;
}

export type FlowStap =
  | "triage"
  | "voorwaarde-check"
  | "dead-end"
  | "verwezen"
  | "anamnese"
  | "test-select"
  | "test-interpretatie"
  | "behandelstrategie"
  | "educatie"
  | "afgerond"
  | "followup-entry"
  | "followup-uitkomst";

export interface Interrupt {
  bron: string; // bv. "Anamnese: RF-001" of "Test: Dix-Hallpike"
  interpretatie: string;
  actietype: string;
  bevestigd: boolean;
}

/**
 * stapType: de StapLog.stap_type-waarde (requirements §1.5) die deze
 * trail-entry vertegenwoordigt, voor synchronisatie naar de sessie-opslag
 * (stap 4). `null` voor entries die geen eigen StapLog-rij krijgen (bijv.
 * "Rode vlag"-acknowledgement-entries — die voegen geen nieuwe klinische
 * bevinding toe naast de anamnese-/test-entry die de rode vlag al triggerde).
 */
export interface ReasoningTrailEntry {
  stap: string;
  stapType: "triage" | "anamnese" | "test" | "interpretatie" | "strategie" | "educatie" | "followup" | null;
  tekst: string;
  objectIds: string[];
  evidenceNiveau: string | null;
}

export interface FollowupState {
  vorigeInterventieId: string | null;
  /// BPPV — één evaluatielus (ongewijzigd).
  uitkomst: "succes" | "herhaling" | "kanaalconversie" | "falen" | null;
  /// Items met een fase-as (bijv. vestibulaire hypofunctie, requirements
  /// §7.3) — twee losse, onafhankelijke evaluatielussen i.p.v. het
  /// enkelvoudige `uitkomst`-veld hierboven. Kunnen los van elkaar afwijken
  /// (referentiedocument §14): bewust twee aparte velden, nooit samengevoegd
  /// tot één goed/fout-oordeel.
  faseVoortgang: "verwacht" | "nog-niet" | "afwijkend" | null;
  interventieEffect: "effectief" | "onvoldoende" | null;
  /// Items met vereistEpisodeTrend (bijv. PPPD, requirements §8.4/§8.5 stap
  /// 4) — trendmatige evaluatie i.p.v. binaire hertest. Niet als los
  /// schemaveld opgeslagen (zie episodes.ts) — alleen client-side state tot
  /// de trail-entry wordt weggeschreven.
  npqScore: number | null;
  patroonType: "verwachte_fluctuatie" | "afwijkend_beloop" | null;
  notitie: string | null;
}

export interface FlowState {
  flow: FlowData | null;
  laden: boolean;
  fout: string | null;

  /// Id van de gekoppelde Sessie (§1.5) — null totdat de omringende
  /// component (ReasoningFlow.tsx) er een heeft aangemaakt. Persistentie
  /// zelf (het daadwerkelijk wegschrijven) gebeurt buiten de reducer, in
  /// een effect dat nieuwe trail-entries synchroniseert.
  sessieId: string | null;

  stap: FlowStap;
  hypotheses: HypotheseState[];
  gekozenTriageId: string | null;
  interrupt: Interrupt | null;

  /// Requirements §8.1: harde gate — welke aandoening-id wacht op
  /// voorwaarde-bevestiging vóórdat er naar die bundel gewisseld wordt.
  /// Null buiten de "voorwaarde-check"-stap.
  voorwaardeCheckPending: { id: string; naam: string; voorwaarde: FlowVoorwaarde } | null;
  /// Bevestigde voorwaarde-relaties in DEZE flow-sessie, per relatieId —
  /// nooit gepersisteerd/overgenomen uit een eerdere sessie (zelfde principe
  /// als gekozenFase, §7.1).
  voorwaardenBevestigd: Record<string, boolean>;

  /// Requirements §8.4: id van het Behandelepisode waaraan het huidige
  /// (vervolg)consult gekoppeld is — alleen relevant bij vereistEpisodeTrend.
  /// Null buiten die flow, en bij een RESET/nieuwe START_FOLLOWUP altijd
  /// opnieuw gekozen (nooit automatisch overgenomen, zelfde principe als
  /// gekozenFase/voorwaardenBevestigd).
  episodeId: string | null;

  anamneseAntwoorden: Record<string, boolean>;

  gekozenTestId: string | null;
  gekozenBevindingRelatieId: string | null;
  bevestigdeKwalificatie: Record<string, string> | null;
  /// Bijvangst §8.5 stap 4: een aparte afronding-vlag, los van
  /// bevestigdeKwalificatie hierboven — die kan legitiem null zijn (PPPD's
  /// Bárány-criteria hebben geen subtype/fase-as, referentiedocument §15),
  /// dus kan niet als "is de hypothese bevestigd?"-signaal dienen. Vóór deze
  /// toevoeging bleef "Naar behandelstrategie" bij zulke items onzichtbaar
  /// en werd Sessie.aandoeningId nooit gekoppeld (zie ReasoningFlow.tsx).
  hypotheseBevestigd: boolean;

  /// Requirements §7.1: fase is een tijdgebonden state, wordt via
  /// samengestelde anamnese/observatie bepaald (geen aparte test) en moet
  /// bij elke sessie opnieuw worden vastgesteld — vandaar een los veld i.p.v.
  /// afgeleid uit een testbevinding, en altijd null bij een nieuwe/RESET-te
  /// flow (nooit automatisch overgenomen uit een eerdere sessie).
  gekozenFase: string | null;

  gekozenInterventieId: string | null;
  contraIndicatieAntwoorden: Record<string, boolean>;

  eduVrijgegeven: boolean;
  trail: ReasoningTrailEntry[];
  followup: FollowupState;
}

export type FlowAction =
  | { type: "LADEN_START" }
  | { type: "LADEN_OK"; flow: FlowData }
  | { type: "LADEN_FOUT"; fout: string }
  | { type: "SESSIE_GESTART"; sessieId: string }
  | { type: "KIES_TRIAGE"; id: string }
  // Requirements §7.4 stap 3: wisselen naar een ANDER, zelf ook volledig
  // uitgewerkt item (bijv. van BPPV naar vestibulaire hypofunctie) vereist
  // een nieuwe bundel op te halen — dat kan de reducer niet zelf (async),
  // vandaar een apart start/ok/fout-drietal i.p.v. gewoon KIES_TRIAGE.
  | { type: "TRIAGE_WISSEL_START" }
  | { type: "TRIAGE_WISSEL_OK"; flow: FlowData }
  | { type: "TRIAGE_WISSEL_FOUT"; fout: string }
  | { type: "KIES_FASE"; fase: string }
  // Requirements §8.1: harde gate vóór het wisselen naar een voorwaarde-
  // gated aandoening (bijv. PPPD). START zet de stap op "voorwaarde-check";
  // BEVESTIG markeert de voorwaarde als vervuld (de daadwerkelijke
  // bundel-wissel gebeurt daarna via TRIAGE_WISSEL_*, net als bij een
  // ongated item); ANNULEER gaat terug naar de triagevraag.
  | { type: "START_VOORWAARDE_CHECK"; id: string; naam: string; voorwaarde: FlowVoorwaarde }
  | { type: "BEVESTIG_VOORWAARDE"; relatieId: string }
  | { type: "ANNULEER_VOORWAARDE_CHECK" }
  // Requirements §8.4: koppelt het huidige (vervolg)consult aan een
  // Behandelepisode — puur structureel, geen klinische bevinding, dus geen
  // eigen trail-entry (vgl. SESSIE_GESTART hierboven).
  | { type: "EPISODE_GEKOZEN"; episodeId: string }
  // Requirements §8.5 stap 4: trendmatige follow-up-invoer (NPQ-score +
  // patroon-type + optionele notitie) voor items met vereistEpisodeTrend.
  | {
      type: "FOLLOWUP_TREND_INVOER";
      npqScore: number;
      patroonType: "verwachte_fluctuatie" | "afwijkend_beloop";
      notitie: string;
    }
  | { type: "TRIGGER_INTERRUPT"; interrupt: Interrupt }
  | { type: "BEVESTIG_INTERRUPT" }
  | { type: "NA_INTERRUPT_VERWEZEN" }
  | { type: "NA_INTERRUPT_DOORGAAN" }
  | { type: "ANAMNESE_ANTWOORD"; redFlagId: string; aanwezig: boolean }
  | { type: "GA_NAAR_TESTSELECTIE" }
  | { type: "KIES_TEST"; testId: string }
  | { type: "KIES_BEVINDING"; relatieId: string }
  | { type: "TERUG_NAAR_TESTSELECTIE" }
  | { type: "GA_NAAR_BEHANDELSTRATEGIE" }
  | { type: "KIES_INTERVENTIE"; interventieId: string }
  | { type: "CI_ANTWOORD"; ciId: string; aanwezig: boolean }
  | { type: "BEVESTIG_BEHANDELSTRATEGIE" }
  | { type: "VRIJGEVEN_EDUCATIE" }
  | { type: "AFRONDEN" }
  | { type: "START_FOLLOWUP" }
  | { type: "FOLLOWUP_INTERVENTIE"; interventieId: string }
  | { type: "FOLLOWUP_UITKOMST"; uitkomst: NonNullable<FollowupState["uitkomst"]> }
  | { type: "FOLLOWUP_FASE_VOORTGANG"; waarde: NonNullable<FollowupState["faseVoortgang"]> }
  | { type: "FOLLOWUP_INTERVENTIE_EFFECT"; waarde: NonNullable<FollowupState["interventieEffect"]> }
  | { type: "RESET" };
