/**
 * Optionele verfijningslaag bovenop de deterministische AI-laag (§3, zie
 * src/ai.ts). Kernprincipe (referentiedocument §12): "de kennisbank is de
 * bron, AI is een vertaal- en presentatielaag — nooit zelfstandige bron van
 * medische waarheid." Deze module mag daarom UITSLUITEND al-bepaalde
 * brontekst herformuleren, nooit zelf inhoud toevoegen — vandaar de strikte
 * system-prompt hieronder en het feit dat object_ids/escalatie/geen-
 * antwoord-status altijd al vóór deze stap in src/ai.ts zijn vastgesteld.
 *
 * Bewust optioneel en degradeert stil: zonder ANTHROPIC_API_KEY (of geen
 * werkende API-toegang) blijft het systeem volledig functioneel op de
 * deterministische tekst uit src/ai.ts — dat is geen bijzaak maar een van de
 * vereisten uit dit bouwonderdeel: de kern moet zonder AI-sleutel testbaar
 * zijn. Deze laag is in deze bouwronde niet live getest (geen API-sleutel
 * beschikbaar in de ontwikkelomgeving) — wel opgezet volgens de huidige
 * Claude-API (@anthropic-ai/sdk), met een expliciete, nauw begrensde
 * system-prompt en een harde fallback bij elke fout.
 */

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    client = null;
    return client;
  }
  client = new Anthropic();
  return client;
}

const SYSTEM_PROMPT =
  "Je bent een herformuleringsassistent voor een fysiotherapie-kennisbank over duizeligheid. " +
  "Je taak is UITSLUITEND: de aangeleverde brontekst natuurlijker/vlotter herformuleren voor de " +
  "opgegeven doelgroep. Regels, zonder uitzondering:\n" +
  "1. Voeg geen enkel nieuw feit, cijfer, aanbeveling of klinische claim toe die niet al letterlijk " +
  "in de brontekst staat.\n" +
  "2. Verzwak, verdoezel of relativeer geen waarschuwing of urgentie uit de brontekst.\n" +
  "3. Als de brontekst een waarschuwing/rode vlag bevat, moet die in je herformulering minstens even " +
  "nadrukkelijk vooraan blijven staan.\n" +
  "4. Als je twijfelt of iets in de brontekst staat, laat het weg — verzin niets erbij.\n" +
  "5. Antwoord alleen met de herformuleerde tekst zelf, zonder inleiding, aanhef of meta-commentaar.";

export interface VerfijndAntwoord {
  tekst: string;
}

/**
 * Herformuleert `brontekst` (en alleen die tekst) natuurlijker. Retourneert
 * null als er geen API-toegang is, of als de aanroep om welke reden dan ook
 * mislukt — de aanroeper valt dan terug op de deterministische brontekst
 * zelf (nooit een lege of gegokte tekst).
 */
export async function verfijnMetClaude(
  context: string,
  brontekst: string,
  doelgroep: "therapeut" | "patient"
): Promise<VerfijndAntwoord | null> {
  const c = getClient();
  if (!c) return null;

  try {
    const response = await c.messages.create({
      model: "claude-opus-5",
      max_tokens: 800,
      // Lichte herformuleringstaak, geen diepe redenering nodig — vandaar
      // effort "low" (kost/latency omlaag zonder de taak zelf te raken).
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Doelgroep: ${doelgroep === "patient" ? "patiënt (leken-taal)" : "fysiotherapeut (vaktaal mag)"}\n` +
            `Context van de vraag: ${context}\n\n` +
            `Brontekst (de enige toegestane inhoud):\n${brontekst}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      console.warn("Claude-verfijning geweigerd door veiligheidsclassificatie, val terug op brontekst.");
      return null;
    }

    const tekst = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return tekst ? { tekst } : null;
  } catch (e) {
    console.error("Claude-verfijning mislukt, val terug op deterministische tekst:", e);
    return null;
  }
}
