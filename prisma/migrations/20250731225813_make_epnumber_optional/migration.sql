-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clipName" TEXT,
    "user" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "epnumber" TEXT NOT NULL DEFAULT 'エピソード不明',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Clip" ("clipName", "createdAt", "endTime", "epnumber", "id", "service", "startTime", "title", "url", "user") SELECT "clipName", "createdAt", "endTime", "epnumber", "id", "service", "startTime", "title", "url", "user" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
