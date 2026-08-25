import { useEffect, useMemo, useReducer, useRef } from "react";
import { fetchFlowData } from "../api";
import { startSessie, postStap, zetAandoening, koppelEpisode } from "../sessies/api";
import { HypothesePanel } from "./HypothesePanel";
import { RedFlagModal } from "./RedFlagModal";
import { SamenvattingPaneel } from "./SamenvattingPaneel";
import { EpisodeKiezer } from "./EpisodeKiezer";
import { EpisodeTrendPaneel } from "./EpisodeTrendPaneel";
import { TrendInvoerForm } from "./TrendInvoerForm";
import { AiEducatieBlok } from "../ai/AiEducatieBlok";
import { flowReducer, initialFlowState } from "./reducer";
import { fmtLabel, effectieveDiagnostischeWaarde } from "./logic";
import type { FlowInterventie, FlowTest, FlowVoorwaarde } from "./types";

const DIAGN_ORDE: Record<string, number> = { hoog: 3, matig: 2, laag: 1 };

// Kruisverwijzing van een niet-BPPV-triagekeuze naar een reeds bestaande red
// flag die dezelfde klinische presentatie beschrijft — puur ter oriëntatie,
// géén nieuwe claim: hergebruikt alleen wat al in de kennisbank staat.
const DEAD_END_VEILIGHEIDSHINT: Record<string, string> = {
  "STUB-CVA-TIA": "RF-001",
  "STUB-ORTHOSTASE": "RF-004",
  "STUB-LABYRINTITIS": "RF-009",
  "STUB-ACUSTICUSNEURINOOM": "RF-003",
};

export function ReasoningFlow() {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);

  useEffect(() => {
    dispatch({ type: "LADEN_START" });
    fetchFlowData()
      .then((flow) => dispatch({ type: "LADEN_OK", flow }))
      .catch((e) => dispatch({ type: "LADEN_FOUT", fout: String(e) }));
  }, []);

  // --- Sessie-opslag (§1.5/§2.3, stap 4) -------------------------------
  // Deze effects zijn de enige plek waar de flow daadwerkelijk naar de
  // server schrijft — de reducer zelf blijft een pure state-machine.

  // Sessie pas aanmaken bij de EERSTE echte handeling (trail.length > 0 —
  // meestal de triagekeuze), niet zodra de pagina/tab simpelweg openstaat.
  // Anders zou elke app-load/reload een lege sessie achterlaten (geldt ook
  // na RESET/START_FOLLOWUP, die sessieId en trail bewust resetten).
  const sessieWordtGestartRef = useRef(false);
  useEffect(() => {
    if (state.trail.length === 0 || state.sessieId || sessieWordtGestartRef.current) return;
    sessieWordtGestartRef.current = true;
    startSessie()
      .then((s) => {
        dispatch({ type: "SESSIE_GESTART", sessieId: s.id });
        sessieWordtGestartRef.current = false;
      })
      .catch(() => {
        sessieWordtGestartRef.current = false;
      });
  }, [state.trail.length, state.sessieId]);

  // Nieuwe trail-entries (met een stapType) synchroniseren als StapLog.
  // gesyncTotRef en vorigeSessieIdRef zitten bewust in dezelfde effect (niet
  // twee losse effects op state.sessieId): de sessieId-transitie kan in
  // dezelfde render al een niet-lege trail hebben (bijv. de eerste triage-/
  // follow-up-entry die de sessie-start zelf triggerde) — met twee losse
  // effects zou de "teller resetten"-effect ná de sync-effect draaien en zo
  // een net gesynchroniseerde teller weer op 0 zetten, wat bij de eerstvolgende
  // trail-wijziging tot een dubbel gesynchroniseerde (dubbele) eerste regel
  // in de sessie-samenvatting leidt.
  const gesyncTotRef = useRef(0);
  const vorigeSessieIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.sessieId) return;
    if (vorigeSessieIdRef.current !== state.sessieId) {
      vorigeSessieIdRef.current = state.sessieId;
      gesyncTotRef.current = 0;
    }
    const nieuw = state.trail.slice(gesyncTotRef.current);
    if (nieuw.length === 0) return;
    gesyncTotRef.current = state.trail.length;
    nieuw
      .filter((entry) => entry.stapType !== null)
      .forEach((entry) => {
        postStap(state.sessieId!, {
          stapType: entry.stapType!,
          objectIdsGebruikt: entry.objectIds,
          bevinding: entry.tekst,
        }).catch(() => {
          /* best-effort: sessie-logging mag de flow zelf niet blokkeren */
        });
      });
  }, [state.sessieId, state.trail]);

  // aandoening_id koppelen zodra de flow convergeert op een bevestigd
  // subtype (§1.5: "Pas gezet zodra de flow convergeert").
  const aandoeningGezetRef = useRef(false);
  useEffect(() => {
    aandoeningGezetRef.current = false;
  }, [state.sessieId]);
  useEffect(() => {
    if (!state.sessieId || !state.flow || !state.hypotheseBevestigd || aandoeningGezetRef.current) return;
    aandoeningGezetRef.current = true;
    zetAandoening(state.sessieId, state.flow.aandoening.id).catch(() => {
      aandoeningGezetRef.current = false;
    });
  }, [state.sessieId, state.flow, state.hypotheseBevestigd]);

  // episodeId koppelen aan de sessie zodra beide bekend zijn (§8.4) — de
  // episode-keuze (EpisodeKiezer) gebeurt vóór de sessie noodzakelijk al
  // bestaat (die ontstaat pas bij de eerste trail-entry), dus dit loopt via
  // een eigen effect i.p.v. inline bij EPISODE_GEKOZEN.
  const episodeGekoppeldRef = useRef(false);
  useEffect(() => {
    episodeGekoppeldRef.current = false;
  }, [state.sessieId]);
  useEffect(() => {
    if (!state.sessieId || !state.episodeId || episodeGekoppeldRef.current) return;
    episodeGekoppeldRef.current = true;
    koppelEpisode(state.sessieId, state.episodeId).catch(() => {
      episodeGekoppeldRef.current = false;
    });
  }, [state.sessieId, state.episodeId]);

  const gekozenTest: FlowTest | undefined = useMemo(
    () => state.flow?.testen.find((t) => t.id === state.gekozenTestId),
    [state.flow, state.gekozenTestId]
  );

  const gekozenBevinding = useMemo(
    () => gekozenTest?.bevindingen.find((b) => b.relatieId === state.gekozenBevindingRelatieId),
    [gekozenTest, state.gekozenBevindingRelatieId]
  );

  // Requirements §7.1: fase (anamnese/observatie-bepaald) en lateraliteit
  // (test-bepaald) zijn twee onafhankelijke assen — samen de "bevestigde"
  // kwalificatie waarop interventies worden gematcht. Generiek over
  // willekeurige kwalificatie-sleutels (niet hardcoded op subtype/variant of
  // fase/lateraliteit), zodat dit ongewijzigd voor elk toekomstig item werkt.
  const bevestigdeAssen: Record<string, string> = useMemo(
    () => ({
      ...(state.bevestigdeKwalificatie ?? {}),
      ...(state.gekozenFase ? { fase: state.gekozenFase } : {}),
    }),
    [state.bevestigdeKwalificatie, state.gekozenFase]
  );

  // Heeft dit item een fase-as? Afgeleid uit de data zelf (niet hardcoded op
  // een item-id) — waar is momenteel alleen voor AAND-002, maar dit blijft
  // correct voor elk toekomstig item met dezelfde datavorm.
  const heeftFaseAs = useMemo(
    () => state.flow?.interventies.some((i) => i.indicatieKwalificaties.some((k) => k && "fase" in k)) ?? false,
    [state.flow]
  );

  // Bijvangst §8.5 stap 4: een null kwalificatie-entry betekent "ongeclausuleerd
  // geïndiceerd" (bijv. INT-009/INT-010 bij PPPD — geen fase/subtype-as,
  // referentiedocument §15), niet "matcht nooit". Vóór deze fix werd zo'n
  // entry (en de vroege return bij een lege bevestigdeAssen, wat bij een
  // item zonder ENKELE as altijd het geval is) onterecht uitgesloten, waardoor
  // PPPD's behandelstrategie-stap altijd "geen gevalideerde interventie" toonde.
  const passendeInterventies: FlowInterventie[] = useMemo(() => {
    if (!state.flow || !state.hypotheseBevestigd) return [];
    return state.flow.interventies.filter((i) =>
      i.indicatieKwalificaties.some(
        (k) =>
          k === null ||
          Object.entries(k).every(([sleutel, waarde]) => !bevestigdeAssen[sleutel] || bevestigdeAssen[sleutel] === waarde)
      )
    );
  }, [state.flow, state.hypotheseBevestigd, bevestigdeAssen]);

  const gekozenInterventie = state.flow?.interventies.find((i) => i.id === state.gekozenInterventieId);

  if (state.laden) return <p className="hint">Reasoning-flow laden…</p>;
  if (state.fout) return <p className="error">{state.fout}</p>;
  if (!state.flow) return null;

  const flow = state.flow;
  const vereistEpisodeTrend = flow.aandoening.vereistEpisodeTrend;

  async function wisselNaarAandoening(id: string) {
    dispatch({ type: "TRIAGE_WISSEL_START" });
    try {
      const nieuweFlow = await fetchFlowData(id);
      dispatch({ type: "TRIAGE_WISSEL_OK", flow: nieuweFlow });
    } catch (e) {
      dispatch({ type: "TRIAGE_WISSEL_FOUT", fout: String(e) });
    }
  }

  // Requirements §7.4 stap 3: kiezen van de HUIDIGE bundel of een niet-
  // volledig-uitgewerkte (dead-end) differentiaal blijft synchroon
  // (KIES_TRIAGE). Wisselen naar een ANDER, zelf ook volledig item vereist
  // een nieuwe bundel op te halen — en als dat item een voorwaarde-gate
  // heeft (requirements §8.1, bijv. PPPD) die nog niet bevestigd is, gaat
  // dat NIET direct: eerst de voorwaarde-check-stap, pas ná expliciete
  // bevestiging de daadwerkelijke wissel (zie bevestigVoorwaardeEnWissel).
  async function kiesTriage(id: string, naam: string, volledigUitgewerkt: boolean, voorwaarde: FlowVoorwaarde | null) {
    // Bijvangst §8.5 stap 4: de voorwaarde-check gaat vóór de "is dit al de
    // huidige bundel"-kortsluiting — anders omzeilt de PRIMAIRE triagekaart
    // (id === flow.aandoening.id, bijv. bij een nieuwe sessie terwijl PPPD
    // al de geladen bundel is) de gate volledig (§8.1: "harde gate").
    if (voorwaarde && !state.voorwaardenBevestigd[voorwaarde.relatieId]) {
      dispatch({ type: "START_VOORWAARDE_CHECK", id, naam, voorwaarde });
      return;
    }
    if (id === flow.aandoening.id || !volledigUitgewerkt) {
      dispatch({ type: "KIES_TRIAGE", id });
      return;
    }
    await wisselNaarAandoening(id);
  }

  async function bevestigVoorwaardeEnWissel() {
    if (!state.voorwaardeCheckPending) return;
    const { id, voorwaarde } = state.voorwaardeCheckPending;
    dispatch({ type: "BEVESTIG_VOORWAARDE", relatieId: voorwaarde.relatieId });
    await wisselNaarAandoening(id);
  }

  const alleContraIndicatiesBeantwoord =
    gekozenInterventie != null &&
    gekozenInterventie.contraIndicaties.every((ci) => ci.id in state.contraIndicatieAntwoorden);

  return (
    <div className="reasoning-flow">
      {state.interrupt && !state.interrupt.bevestigd && (
        <RedFlagModal interrupt={state.interrupt} onBevestig={() => dispatch({ type: "BEVESTIG_INTERRUPT" })} />
      )}

      <div className="flow-layout">
        <div className="flow-main">
          {state.interrupt && state.interrupt.bevestigd && (
            <div className="interrupt-banner">
              <p>
                <strong>{state.interrupt.bron}:</strong> {state.interrupt.interpretatie} — geadviseerde actie:{" "}
                <strong>{fmtLabel(state.interrupt.actietype)}</strong>
              </p>
              <div className="interrupt-actions">
                <button type="button" className="btn-primary" onClick={() => dispatch({ type: "NA_INTERRUPT_VERWEZEN" })}>
                  Traject beëindigen (verwezen)
                </button>
                <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "NA_INTERRUPT_DOORGAAN" })}>
                  Toch doorgaan (eigen klinisch oordeel)
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STAP: triage ---------------- */}
          {state.stap === "triage" && (
            <section className="flow-step">
              <p className="eyebrow">Stap 1 · Intake/aanleiding</p>
              <h2>Wat past het beste bij de aanleiding van de klacht?</h2>
              <p className="hint">
                Deze vraag houdt bewust meerdere hypothesen tegelijk open — er wordt nog geen pad
                gedwongen gekozen (referentiedocument §22 stap 1).
              </p>
              <div className="triage-opties">
                <button
                  type="button"
                  className="triage-card"
                  onClick={() => kiesTriage(flow.aandoening.id, flow.aandoening.naam, true, flow.aandoening.voorwaarde)}
                >
                  <strong>{flow.aandoening.klinischeKenmerken?.split(".")[0]}.</strong>
                  <span className="hint">→ past bij {flow.aandoening.naam}</span>
                </button>
                {flow.differentialen.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    className="triage-card"
                    onClick={() => kiesTriage(d.id, d.naam, d.volledigUitgewerkt, d.voorwaarde)}
                  >
                    <strong>{d.kenmerk}</strong>
                    <span className="hint">
                      → past bij {d.naam}
                      {d.volledigUitgewerkt && d.id !== flow.aandoening.id
                        ? d.voorwaarde
                          ? " (volledig uitgewerkt, onder voorwaarde)"
                          : " (volledig uitgewerkt)"
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className="link-button followup-link" onClick={() => dispatch({ type: "START_FOLLOWUP" })}>
                Dit is een vervolgconsult →
              </button>
            </section>
          )}

          {/* ---------------- STAP: voorwaarde-check (requirements §8.1) ---------------- */}
          {state.stap === "voorwaarde-check" && state.voorwaardeCheckPending && (
            <section className="flow-step">
              <p className="eyebrow">Voorwaarde controleren</p>
              <h2>{state.voorwaardeCheckPending.naam}</h2>
              <p className="hint">
                Deze hypothese mag pas overwogen worden als aan de volgende voorwaarde is voldaan
                (requirements §8.1) — dit is een harde gate, geen suggestie.
              </p>
              <div className="interpretatie-card">
                <p>
                  <strong>Voorwaarde:</strong> {state.voorwaardeCheckPending.voorwaarde.bevinding}
                </p>
                <p>
                  <strong>Betekenis:</strong> {state.voorwaardeCheckPending.voorwaarde.interpretatie}
                </p>
                <div className="meta-row">
                  <span className="badge mono">{state.voorwaardeCheckPending.voorwaarde.anamneseItemId}</span>
                </div>
              </div>
              <div className="flow-actions">
                <button type="button" className="btn-primary" onClick={bevestigVoorwaardeEnWissel}>
                  Voorwaarde bevestigd — hypothese overwegen
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => dispatch({ type: "ANNULEER_VOORWAARDE_CHECK" })}
                >
                  Terug naar triage
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STAP: dead-end (niet-BPPV-hypothese) ---------------- */}
          {state.stap === "dead-end" && (
            <section className="flow-step">
              <p className="eyebrow">Nog niet uitgewerkt</p>
              <h2>
                {flow.differentialen.find((d) => d.id === state.gekozenTriageId)?.naam ?? state.gekozenTriageId}
              </h2>
              <p>
                Dit item is in deze bouwronde alleen als stub aanwezig — er is nog geen anamnese-,
                test- of interventiecontent voor gebouwd (dat volgt na MVP-validatie, referentiedocument
                §13). Het systeem doet hier bewust niet alsof het kan redeneren over content die niet
                in de kennisbank staat (§12).
              </p>
              {state.gekozenTriageId && DEAD_END_VEILIGHEIDSHINT[state.gekozenTriageId] && (
                <p className="veiligheidshint">
                  Wel al in de kennisbank aanwezig: dit beeld overlapt met signaal{" "}
                  <strong>{DEAD_END_VEILIGHEIDSHINT[state.gekozenTriageId]}</strong> — raadpleeg Modus B
                  voor het volledige signaal.
                </p>
              )}
              <button type="button" className="btn-primary" onClick={() => dispatch({ type: "RESET" })}>
                Terug naar triage
              </button>
            </section>
          )}

          {/* ---------------- STAP: verwezen (terminaal) ---------------- */}
          {state.stap === "verwezen" && (
            <section className="flow-step">
              <p className="eyebrow">Traject beëindigd</p>
              <h2>Patiënt verwezen</h2>
              <p>Het {flow.aandoening.naam}-traject is beëindigd op basis van de bevestigde rode vlag hierboven.</p>
              {state.sessieId && <SamenvattingPaneel sessieId={state.sessieId} />}
              <button type="button" className="btn-primary" onClick={() => dispatch({ type: "RESET" })}>
                Nieuwe triage starten
              </button>
            </section>
          )}

          {/* ---------------- STAP: anamnese ---------------- */}
          {state.stap === "anamnese" && (
            <section className="flow-step">
              <p className="eyebrow">Stap 2 · Gestructureerde anamnese</p>
              <h2>Signalen uitvragen</h2>
              <p className="hint">Rode-vlag-monitoring is doorlopend — ook hier kan een bevinding de flow onderbreken (§5).</p>
              <ul className="anamnese-list">
                {flow.anamneseChecks.map((c) => (
                  <li key={c.redFlagId} className="anamnese-item">
                    <p>{c.bevinding}</p>
                    <div className="anamnese-buttons">
                      <button
                        type="button"
                        className={state.anamneseAntwoorden[c.redFlagId] === true ? "chip-toggle active" : "chip-toggle"}
                        onClick={() => dispatch({ type: "ANAMNESE_ANTWOORD", redFlagId: c.redFlagId, aanwezig: true })}
                      >
                        Aanwezig
                      </button>
                      <button
                        type="button"
                        className={state.anamneseAntwoorden[c.redFlagId] === false ? "chip-toggle active" : "chip-toggle"}
                        onClick={() => dispatch({ type: "ANAMNESE_ANTWOORD", redFlagId: c.redFlagId, aanwezig: false })}
                      >
                        Afwezig
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {heeftFaseAs && (
                <div className="fase-selector">
                  <h3>Fase vaststellen</h3>
                  <p className="hint">
                    Fase is een tijdgebonden state, geen vast kenmerk — wordt via samengestelde
                    anamnese/observatie bepaald (geen aparte test) en moet bij elk consult opnieuw
                    worden vastgesteld, nooit automatisch overgenomen uit een eerdere sessie
                    (requirements §7.1).
                  </p>
                  <div className="fase-opties">
                    {[
                      { waarde: "acuut", label: "Acuut" },
                      { waarde: "chronisch-compensatie", label: "Chronisch/compensatie" },
                      { waarde: "geen-duidelijke-acute-fase", label: "Geen duidelijke acute fase" },
                    ].map((optie) => (
                      <button
                        type="button"
                        key={optie.waarde}
                        className={state.gekozenFase === optie.waarde ? "chip-toggle active" : "chip-toggle"}
                        onClick={() => dispatch({ type: "KIES_FASE", fase: optie.waarde })}
                      >
                        {optie.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" className="btn-primary" onClick={() => dispatch({ type: "GA_NAAR_TESTSELECTIE" })}>
                Naar testselectie
              </button>
            </section>
          )}

          {/* ---------------- STAP: test-select ---------------- */}
          {state.stap === "test-select" && (
            <section className="flow-step">
              <p className="eyebrow">Stap 3 · Testselectie en -uitvoering</p>
              <h2>Kies een test</h2>
              <p className="hint">Gesorteerd op hoogste diagnostische waarde t.o.v. de gewogen hypothese.</p>
              <ul className="test-list">
                {[...flow.testen]
                  .sort((a, b) => {
                    const maxA = Math.max(0, ...a.bevindingen.map((x) => DIAGN_ORDE[x.diagnostischeWaarde ?? ""] ?? 0));
                    const maxB = Math.max(0, ...b.bevindingen.map((x) => DIAGN_ORDE[x.diagnostischeWaarde ?? ""] ?? 0));
                    return maxB - maxA;
                  })
                  .map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={state.gekozenTestId === t.id ? "result-card active" : "result-card"}
                        onClick={() => dispatch({ type: "KIES_TEST", testId: t.id })}
                      >
                        <div className="result-card-title">{t.naam}</div>
                        <p className="result-snippet">{t.kernbeschrijving}</p>
                        <span className="badge evidence">{fmtLabel(t.evidenceNiveau)}</span>
                      </button>
                    </li>
                  ))}
              </ul>

              {gekozenTest && (
                <div className="bevinding-keuze">
                  <h3>{gekozenTest.naam} — wat zie je?</h3>
                  <ul className="bevinding-list">
                    {gekozenTest.bevindingen.map((b) => {
                      // Requirements §8.1: TEST-005's diagnostische waarde is
                      // conditioneel (geen vaste waarde) — hier opgelost aan
                      // de hand van de in déze flow-sessie bevestigde
                      // voorwaarden. Voor alle andere tests ongewijzigd
                      // (b.diagnostischeWaarde staat daar al vast).
                      const waarde = effectieveDiagnostischeWaarde(b, state.voorwaardenBevestigd);
                      const isConditioneel = !b.diagnostischeWaarde && !!b.diagnostischeWaardeVoorwaardeRelatieId;
                      return (
                        <li key={b.relatieId}>
                          <button type="button" className="bevinding-optie" onClick={() => dispatch({ type: "KIES_BEVINDING", relatieId: b.relatieId })}>
                            <span>{b.bevinding}</span>
                            {waarde && (
                              <span className="badge">
                                Diagn. waarde: {fmtLabel(waarde)}
                                {isConditioneel ? " (voorwaarde vervuld)" : ""}
                              </span>
                            )}
                            {b.actietype && <span className="badge critical">{fmtLabel(b.actietype)}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ---------------- STAP: test-interpretatie ---------------- */}
          {state.stap === "test-interpretatie" && gekozenTest && gekozenBevinding && (
            <section className="flow-step">
              <p className="eyebrow">Stap 4 · Interpretatie</p>
              <h2>Interpretatie</h2>
              <div className="interpretatie-card">
                <p>
                  <strong>Bevinding:</strong> {gekozenBevinding.bevinding}
                </p>
                <p>
                  <strong>Interpretatie:</strong> {gekozenBevinding.interpretatie}
                </p>
                <div className="meta-row">
                  <span className="badge mono">{gekozenTest.id}</span>
                  <span className="badge mono">{gekozenBevinding.naarObjectId}</span>
                  <span className="badge evidence">{fmtLabel(gekozenBevinding.evidenceNiveau)}</span>
                </div>
                {/* Requirements §7.1: beide assen (fase + lateraliteit) tegelijk
                    tonen, niet na elkaar — één rij, ongeacht hoeveel assen dit
                    item heeft. */}
                {Object.keys(bevestigdeAssen).length > 0 && (
                  <div className="meta-row">
                    {Object.entries(bevestigdeAssen).map(([sleutel, waarde]) => (
                      <span key={sleutel} className="badge">
                        {sleutel}: {waarde}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {heeftFaseAs && !state.gekozenFase && (
                <p className="veiligheidshint">
                  Fase nog niet vastgesteld — ga terug naar de anamnese-stap om de fase te bepalen
                  vóór de behandelstrategie (requirements §7.1).
                </p>
              )}
              <div className="flow-actions">
                {state.hypotheseBevestigd && (!heeftFaseAs || state.gekozenFase) && (
                  <button type="button" className="btn-primary" onClick={() => dispatch({ type: "GA_NAAR_BEHANDELSTRATEGIE" })}>
                    Naar behandelstrategie
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "TERUG_NAAR_TESTSELECTIE" })}>
                  Andere test proberen
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STAP: behandelstrategie ---------------- */}
          {state.stap === "behandelstrategie" && (
            <section className="flow-step">
              <p className="eyebrow">Stap 5 · Behandelstrategie</p>
              <h2>Interventie</h2>
              {passendeInterventies.length === 0 ? (
                <>
                  <p>
                    Geen breed gevalideerde standaardinterventie voor{" "}
                    <span className="mono">{JSON.stringify(state.bevestigdeKwalificatie)}</span> aanwezig in deze
                    kennisbank (bijv. het anterior kanaal — referentiedocument §2: "geen breed gevalideerde
                    standaard"). Ga af op eigen klinische inschatting.
                  </p>
                  <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "TERUG_NAAR_TESTSELECTIE" })}>
                    Terug naar testselectie
                  </button>
                </>
              ) : (
                <>
                  <ul className="interventie-list">
                    {passendeInterventies.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          className={state.gekozenInterventieId === i.id ? "result-card active" : "result-card"}
                          onClick={() => dispatch({ type: "KIES_INTERVENTIE", interventieId: i.id })}
                        >
                          <div className="result-card-title">{i.naam}</div>
                          <p className="result-snippet">{i.kernbeschrijving}</p>
                          <span className="badge evidence">{fmtLabel(i.evidenceNiveau)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {gekozenInterventie && (
                    <div className="ci-check">
                      <h3>Contra-indicatie-check (verplicht)</h3>
                      {gekozenInterventie.contraIndicaties.length === 0 ? (
                        <p className="hint">Geen contra-indicaties geregistreerd voor deze interventie.</p>
                      ) : (
                        <ul className="anamnese-list">
                          {gekozenInterventie.contraIndicaties.map((ci) => (
                            <li key={ci.id} className="anamnese-item">
                              <p>
                                <strong>{ci.naam}</strong> — {ci.kernbeschrijving}
                              </p>
                              <div className="anamnese-buttons">
                                <button
                                  type="button"
                                  className={state.contraIndicatieAntwoorden[ci.id] === true ? "chip-toggle active" : "chip-toggle"}
                                  onClick={() => dispatch({ type: "CI_ANTWOORD", ciId: ci.id, aanwezig: true })}
                                >
                                  Aanwezig
                                </button>
                                <button
                                  type="button"
                                  className={state.contraIndicatieAntwoorden[ci.id] === false ? "chip-toggle active" : "chip-toggle"}
                                  onClick={() => dispatch({ type: "CI_ANTWOORD", ciId: ci.id, aanwezig: false })}
                                >
                                  Afwezig
                                </button>
                              </div>
                              {state.contraIndicatieAntwoorden[ci.id] && ci.interpretatie && (
                                <p className="veiligheidshint">{ci.interpretatie}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!alleContraIndicatiesBeantwoord}
                        onClick={() => dispatch({ type: "BEVESTIG_BEHANDELSTRATEGIE" })}
                      >
                        Bevestig behandelstrategie
                      </button>
                      {!alleContraIndicatiesBeantwoord && (
                        <p className="hint">Beantwoord eerst elke contra-indicatie om verder te gaan.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ---------------- STAP: educatie ---------------- */}
          {state.stap === "educatie" && flow.educatie && (
            <section className="flow-step">
              <p className="eyebrow">Stap 6 · Patiënteducatie</p>
              <h2>{flow.educatie.naam}</h2>
              <p>{flow.educatie.kernbeschrijving}</p>
              <p>
                <strong>Verwachtingsmanagement:</strong> {flow.educatie.verwachtingsmanagement}
              </p>
              <AiEducatieBlok eduId={flow.educatie.id} />
              <p className="hint">
                Vrijgave is een losse, expliciete actie — nooit automatisch getoond aan een patiëntaccount (§2.1 punt 7).
              </p>
              <div className="flow-actions">
                <button type="button" className="btn-primary" disabled={state.eduVrijgegeven} onClick={() => dispatch({ type: "VRIJGEVEN_EDUCATIE" })}>
                  {state.eduVrijgegeven ? "Vrijgegeven ✓" : "Vrijgeven aan patiënt"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "AFRONDEN" })}>
                  Sessie afronden
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STAP: afgerond ---------------- */}
          {state.stap === "afgerond" && (
            <section className="flow-step">
              <p className="eyebrow">Afgerond</p>
              <h2>Sessie afgerond</h2>
              {state.sessieId && <SamenvattingPaneel sessieId={state.sessieId} />}
              <div className="flow-actions">
                <button type="button" className="btn-primary" onClick={() => dispatch({ type: "RESET" })}>
                  Nieuwe triage starten
                </button>
                <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "START_FOLLOWUP" })}>
                  Vervolgconsult starten
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STAP: followup-entry ---------------- */}
          {state.stap === "followup-entry" && (
            <section className="flow-step">
              <p className="eyebrow">Stap 7 · Follow-up-consult</p>
              {vereistEpisodeTrend && !state.episodeId ? (
                <EpisodeKiezer
                  aandoeningId={flow.aandoening.id}
                  onGekozen={(episodeId) => dispatch({ type: "EPISODE_GEKOZEN", episodeId })}
                />
              ) : (
                <>
                  <h2>Welke interventie werd eerder toegepast?</h2>
                  <p className="hint">
                    Lichte, handmatige instap — de therapeut geeft dit zelf aan, er wordt geen
                    automatische koppeling met een eerdere sessie gezocht (referentiedocument §22/§27).
                  </p>
                  <ul className="interventie-list">
                    {flow.interventies.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          className="result-card"
                          onClick={() => dispatch({ type: "FOLLOWUP_INTERVENTIE", interventieId: i.id })}
                        >
                          <div className="result-card-title">{i.naam}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {/* ---------------- STAP: followup-uitkomst ---------------- */}
          {state.stap === "followup-uitkomst" && heeftFaseAs && (
            <section className="flow-step">
              <p className="eyebrow">Stap 7 · Follow-up-consult</p>
              {state.followup.faseVoortgang === null || state.followup.interventieEffect === null ? (
                <>
                  <h2>Twee onafhankelijke evaluatielussen</h2>
                  <p className="hint">
                    Vorige interventie:{" "}
                    <strong>{flow.interventies.find((i) => i.id === state.followup.vorigeInterventieId)?.naam}</strong>.{" "}
                    Deze twee lussen kunnen los van elkaar afwijken (requirements §7.3) — allebei apart
                    beantwoorden.
                  </p>

                  <div className="followup-lus">
                    <h3>Lus 1 · Fase-voortgang</h3>
                    <p className="hint">Is de patiënt toe aan intensievere training?</p>
                    <div className="triage-opties">
                      <button
                        type="button"
                        className="triage-card"
                        onClick={() => dispatch({ type: "FOLLOWUP_FASE_VOORTGANG", waarde: "verwacht" })}
                      >
                        Ja — toe aan volgende fase
                      </button>
                      <button
                        type="button"
                        className="triage-card"
                        onClick={() => dispatch({ type: "FOLLOWUP_FASE_VOORTGANG", waarde: "nog-niet" })}
                      >
                        Nog niet — huidige fase voortzetten
                      </button>
                      <button
                        type="button"
                        className="triage-card"
                        onClick={() => dispatch({ type: "FOLLOWUP_FASE_VOORTGANG", waarde: "afwijkend" })}
                      >
                        Afwijkend — verslechtering of nieuwe neurologische symptomen
                      </button>
                    </div>
                    {state.followup.faseVoortgang && (
                      <p className="hint">
                        Beantwoord: <strong>{fmtLabel(state.followup.faseVoortgang)}</strong>
                      </p>
                    )}
                  </div>

                  <div className="followup-lus">
                    <h3>Lus 2 · Interventie-effectiviteit</h3>
                    <p className="hint">Slaat de interventie aan (bijv. DVA-hermeting)?</p>
                    <div className="triage-opties">
                      <button
                        type="button"
                        className="triage-card"
                        onClick={() => dispatch({ type: "FOLLOWUP_INTERVENTIE_EFFECT", waarde: "effectief" })}
                      >
                        Effectief — merkbare verbetering
                      </button>
                      <button
                        type="button"
                        className="triage-card"
                        onClick={() => dispatch({ type: "FOLLOWUP_INTERVENTIE_EFFECT", waarde: "onvoldoende" })}
                      >
                        Onvoldoende effect
                      </button>
                    </div>
                    {state.followup.interventieEffect && (
                      <p className="hint">
                        Beantwoord: <strong>{fmtLabel(state.followup.interventieEffect)}</strong>
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2>Resultaat — twee lussen</h2>
                  <div className="followup-resultaat-grid">
                    <div>
                      <h3>Fase-voortgang</h3>
                      <p>{fmtLabel(state.followup.faseVoortgang)}</p>
                    </div>
                    <div>
                      <h3>Interventie-effectiviteit</h3>
                      <p>{fmtLabel(state.followup.interventieEffect)}</p>
                    </div>
                  </div>
                  {state.followup.faseVoortgang === "verwacht" && state.followup.interventieEffect === "onvoldoende" && (
                    <p className="veiligheidshint">
                      Correcte fase-overgang mét onvoldoende interventie-effect kan wijzen op een gemiste
                      bilaterale component of een therapietrouw-probleem — niet op een fase-fout (§7.3).
                    </p>
                  )}
                  {state.followup.faseVoortgang === "afwijkend" && (
                    <p className="veiligheidshint">
                      Wijkt af van verwacht beloop — heroverweeg de hypothese (RF-008).
                    </p>
                  )}
                  {state.sessieId && <SamenvattingPaneel sessieId={state.sessieId} />}
                  <button type="button" className="btn-primary" onClick={() => dispatch({ type: "RESET" })}>
                    Nieuwe triage starten
                  </button>
                </>
              )}
            </section>
          )}

          {/* ---------------- STAP: followup-uitkomst — trendmatig (requirements §8.4/§8.5 stap 4) ---------------- */}
          {state.stap === "followup-uitkomst" && !heeftFaseAs && vereistEpisodeTrend && (
            <section className="flow-step">
              <p className="eyebrow">Stap 7 · Follow-up-consult</p>
              {state.followup.npqScore === null ? (
                <TrendInvoerForm dispatch={dispatch} />
              ) : (
                <>
                  <h2>Resultaat — trend</h2>
                  <div className="followup-resultaat-grid">
                    <div>
                      <h3>NPQ-score</h3>
                      <p>{state.followup.npqScore}</p>
                    </div>
                    <div>
                      <h3>Patroon</h3>
                      <p>{fmtLabel(state.followup.patroonType)}</p>
                    </div>
                  </div>
                  {state.followup.patroonType === "afwijkend_beloop" && (
                    <p className="veiligheidshint">
                      Afwijkend beloop — heroverweeg de hypothese, of overweeg samenwerking
                      (RF-010/011: uitblijvend herstel resp. angststoornis/depressie op voorgrond).
                    </p>
                  )}
                  {state.episodeId && <EpisodeTrendPaneel episodeId={state.episodeId} />}
                  {state.sessieId && <SamenvattingPaneel sessieId={state.sessieId} />}
                  <button type="button" className="btn-primary" onClick={() => dispatch({ type: "RESET" })}>
                    Nieuwe triage starten
                  </button>
                </>
              )}
            </section>
          )}

          {state.stap === "followup-uitkomst" && !heeftFaseAs && !vereistEpisodeTrend && (
            <section className="flow-step">
              <p className="eyebrow">Stap 7 · Follow-up-consult</p>
              {state.followup.uitkomst === null ? (
                <>
                  <h2>Hertest</h2>
                  <p>
                    Vorige interventie:{" "}
                    <strong>{flow.interventies.find((i) => i.id === state.followup.vorigeInterventieId)?.naam}</strong>
                  </p>
                  <div className="triage-opties">
                    <button type="button" className="triage-card" onClick={() => dispatch({ type: "FOLLOWUP_UITKOMST", uitkomst: "succes" })}>
                      Hertest negatief — succes
                    </button>
                    <button type="button" className="triage-card" onClick={() => dispatch({ type: "FOLLOWUP_UITKOMST", uitkomst: "herhaling" })}>
                      Zelfde patroon — nog aanwezig
                    </button>
                    <button type="button" className="triage-card" onClick={() => dispatch({ type: "FOLLOWUP_UITKOMST", uitkomst: "kanaalconversie" })}>
                      Ander patroon — mogelijke kanaalconversie
                    </button>
                    <button type="button" className="triage-card" onClick={() => dispatch({ type: "FOLLOWUP_UITKOMST", uitkomst: "falen" })}>
                      Aanhoudende klachten / nieuwe signalen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>Resultaat</h2>
                  {state.followup.uitkomst === "succes" && (
                    <p>Traject afgesloten. Geef recidief-/alarmsignaal-informatie mee (§25 journey).</p>
                  )}
                  {state.followup.uitkomst === "herhaling" && <p>Herhaal de interventie.</p>}
                  {state.followup.uitkomst === "falen" && <p>Heroverweeg de hypothese, of verwijs door.</p>}
                  {state.sessieId && <SamenvattingPaneel sessieId={state.sessieId} />}
                  <button type="button" className="btn-primary" onClick={() => dispatch({ type: "RESET" })}>
                    Nieuwe triage starten
                  </button>
                </>
              )}
            </section>
          )}
        </div>

        <HypothesePanel hypotheses={state.hypotheses} trail={state.trail} />
      </div>
    </div>
  );
}
