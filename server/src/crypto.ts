/**
 * Encryptie bij opslag (§5.3) voor de klinische inhoud van een sessie
 * (StapLog.bevinding, Sessie.samenvatting) — de "bijzondere persoonsgegevens"
 * uit referentiedocument §23, ook al is er geen patiëntnaam aan gekoppeld.
 *
 * AES-256-GCM: een authenticated-encryption-algoritme (geeft ook
 * integriteitscontrole, niet alleen geheimhouding). De sleutel komt uit
 * ENCRYPTION_KEY (omgevingsvariabele, nooit in de repo) — zie .env.example.
 *
 * TLS bij verzending en de keuze voor een EU-gevestigde hostingprovider
 * (de andere twee onderdelen van §5.3) zijn deployment-beslissingen die pas
 * relevant worden bij een echte hosting-omgeving, niet iets dat vanuit deze
 * lokale codebase af te dwingen is — die horen bij de daadwerkelijke
 * lancering, niet bij deze bouwstap.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // aanbevolen IV-lengte voor GCM

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY ontbreekt of heeft niet de juiste lengte (64 hex-tekens = 32 bytes). " +
        "Zie server/.env.example."
    );
  }
  return Buffer.from(hex, "hex");
}

/** Versleutelt tekst; retourneert null voor null/undefined input (bijv. optionele velden). */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Opslagformaat: iv.authTag.ciphertext, elk base64 — zelfbeschrijvend genoeg
  // om te decrypten zonder aparte kolommen per onderdeel.
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/** Ontsleutelt tekst die met `encrypt` is opgeslagen; retourneert null voor null input. */
export function decrypt(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  const [ivB64, authTagB64, ciphertextB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Ongeldig versleuteld-veld-formaat.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
