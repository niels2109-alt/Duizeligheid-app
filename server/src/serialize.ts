/**
 * De JSON-achtige velden (kwalificatie, bronnen, bron_object_ids,
 * signalering_object_ids) staan in SQLite als tekst opgeslagen (zie
 * toelichting in schema.prisma). Deze helpers zetten ze om naar/van echte
 * JSON voor de API-responses, zodat de frontend er niet mee hoeft om te gaan.
 */

export function parseJsonField<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
