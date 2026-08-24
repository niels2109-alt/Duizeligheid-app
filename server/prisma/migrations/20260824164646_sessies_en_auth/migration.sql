-- CreateTable
CREATE TABLE "therapeuten" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "wachtwoord_hash" TEXT NOT NULL,
    "aangemaakt_op" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sessies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "therapeut_id" TEXT NOT NULL,
    "gestart_op" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aandoening_id" TEXT,
    "samenvatting_enc" TEXT,
    "geexporteerd_op" DATETIME,
    "vervalt_op" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sessies_therapeut_id_fkey" FOREIGN KEY ("therapeut_id") REFERENCES "therapeuten" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sessies_aandoening_id_fkey" FOREIGN KEY ("aandoening_id") REFERENCES "knowledge_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staplog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessie_id" TEXT NOT NULL,
    "stap_type" TEXT NOT NULL,
    "object_ids_gebruikt" TEXT NOT NULL,
    "bevinding_enc" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staplog_sessie_id_fkey" FOREIGN KEY ("sessie_id") REFERENCES "sessies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "therapeuten_email_key" ON "therapeuten"("email");
