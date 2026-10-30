// Presentatielaag-only hulpfuncties voor Modus B (kennisbank-weergave).
// Deze passen alleen aan wát hier wordt getoond — de onderliggende data
// (namen, ID's, kernbeschrijvingen in de database) blijft ongewijzigd, en
// Modus A/sessies/exports blijven die data ongewijzigd tonen/gebruiken.

/**
 * "BPPV" is de term uit de brondocumenten, maar de correcte Nederlandse
 * afkorting is "BPPD" (benigne paroxysmale positieduizeligheid) — dit
 * verandert alleen wat de gebruiker hier leest, niet de opgeslagen data.
 */
export function naarBPPD(tekst: string): string {
  return tekst.replace(/BPPV/g, "BPPD");
}

/**
 * Splitst lopende tekst in losse zinnen, voor weergave als opsomming i.p.v.
 * één blok tekst (bijv. "Klinische kenmerken"). Simpele zin-einde-detectie
 * (leesteken + witruimte) — voldoende voor de korte, telegramstijl-zinnen
 * in deze kennisbank.
 */
export function naarZinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[.!?])\s+/)
    .map((zin) => zin.trim())
    .filter(Boolean);
}
