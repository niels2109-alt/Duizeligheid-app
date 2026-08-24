/**
 * Rolgebaseerde zichtbaarheid — requirements §2.2: "Respecteert
 * zichtbaar_therapeut/zichtbaar_patient per gebruikersrol".
 *
 * Er is in deze bouwstap nog geen echte authenticatie (die hoort bij stap 4,
 * §5.2/§6.2) — de rol komt hier voorlopig gewoon uit de request (query-
 * parameter, door de frontend gezet via de rol-wisselknop). Dat is een
 * bewuste, tijdelijke vereenvoudiging: de zichtbaarheidsregel zelf wordt al
 * wel echt afgedwongen, alleen de identiteit/rol van de gebruiker nog niet
 * geverifieerd.
 */

export type Rol = "therapeut" | "patient";

export function parseRol(value: unknown): Rol {
  return value === "patient" ? "patient" : "therapeut";
}

/** Prisma `where`-fragment dat de zichtbaarheidsregel voor de gegeven rol afdwingt. */
export function zichtbaarheidsFilter(rol: Rol) {
  return rol === "patient" ? { zichtbaarPatient: true } : { zichtbaarTherapeut: true };
}

export function isZichtbaarVoor(
  rol: Rol,
  object: { zichtbaarTherapeut: boolean; zichtbaarPatient: boolean }
): boolean {
  return rol === "patient" ? object.zichtbaarPatient : object.zichtbaarTherapeut;
}
