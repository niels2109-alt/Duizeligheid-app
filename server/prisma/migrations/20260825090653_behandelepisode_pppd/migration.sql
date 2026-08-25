-- CreateTable
CREATE TABLE "behandelepisodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aandoening_id" TEXT NOT NULL,
    "therapeut_id" TEXT NOT NULL,
    "gestart_op" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'actief',
    "vervalt_op" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "behandelepisodes_aandoening_id_fkey" FOREIGN KEY ("aandoening_id") REFERENCES "knowledge_objects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "behandelepisodes_therapeut_id_fkey" FOREIGN KEY ("therapeut_id") REFERENCES "therapeuten" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sessies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "therapeut_id" TEXT NOT NULL,
    "gestart_op" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aandoening_id" TEXT,
    "episode_id" TEXT,
    "samenvatting_enc" TEXT,
    "geexporteerd_op" DATETIME,
    "vervalt_op" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sessies_therapeut_id_fkey" FOREIGN KEY ("therapeut_id") REFERENCES "therapeuten" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sessies_aandoening_id_fkey" FOREIGN KEY ("aandoening_id") REFERENCES "knowledge_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sessies_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "behandelepisodes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_sessies" ("aandoening_id", "created_at", "geexporteerd_op", "gestart_op", "id", "samenvatting_enc", "therapeut_id", "updated_at", "vervalt_op") SELECT "aandoening_id", "created_at", "geexporteerd_op", "gestart_op", "id", "samenvatting_enc", "therapeut_id", "updated_at", "vervalt_op" FROM "sessies";
DROP TABLE "sessies";
ALTER TABLE "new_sessies" RENAME TO "sessies";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
