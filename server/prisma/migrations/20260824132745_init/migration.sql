-- CreateTable
CREATE TABLE "knowledge_objects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naam" TEXT NOT NULL,
    "type_object" TEXT NOT NULL,
    "behandelverantwoordelijkheid" TEXT,
    "behandeldiepte" TEXT,
    "tier" INTEGER,
    "uitkomsttype" TEXT,
    "kernbeschrijving" TEXT NOT NULL,
    "klinische_kenmerken" TEXT,
    "evidence_niveau" TEXT NOT NULL,
    "bronnen" TEXT,
    "status" TEXT NOT NULL,
    "laatst_gecontroleerd_op" DATETIME NOT NULL,
    "zichtbaar_therapeut" BOOLEAN NOT NULL DEFAULT true,
    "zichtbaar_patient" BOOLEAN NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "relaties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "van_object_id" TEXT NOT NULL,
    "naar_object_id" TEXT NOT NULL,
    "relatie_type" TEXT NOT NULL,
    "kwalificatie" TEXT,
    "bevinding" TEXT,
    "interpretatie" TEXT,
    "diagnostische_waarde" TEXT,
    "diagnostische_waarde_voorwaarde_relatie_id" TEXT,
    "relatietype_differentiaal" TEXT,
    "bijdrage_gewicht" TEXT,
    "patroon_type" TEXT,
    "actietype" TEXT,
    "evidence_niveau" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "relaties_van_object_id_fkey" FOREIGN KEY ("van_object_id") REFERENCES "knowledge_objects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "relaties_naar_object_id_fkey" FOREIGN KEY ("naar_object_id") REFERENCES "knowledge_objects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patient_educatie_objecten" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledge_object_id" TEXT NOT NULL,
    "verwachtingsmanagement" TEXT NOT NULL,
    "rationale_uitleg_counterintuitief" TEXT,
    "samengesteld" BOOLEAN NOT NULL DEFAULT false,
    "bron_object_ids" TEXT NOT NULL,
    "signalering_object_ids" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "patient_educatie_objecten_knowledge_object_id_fkey" FOREIGN KEY ("knowledge_object_id") REFERENCES "knowledge_objects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_educatie_objecten_knowledge_object_id_key" ON "patient_educatie_objecten"("knowledge_object_id");
