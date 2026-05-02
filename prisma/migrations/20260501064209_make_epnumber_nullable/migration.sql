-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clipName" TEXT,
    "user" TEXT NOT NULL,
    "userInfo" JSONB,
    "userId" TEXT,
    "service" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "epnumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Clip" ("clipName", "createdAt", "endTime", "epnumber", "id", "service", "startTime", "title", "url", "user", "userId", "userInfo") SELECT "clipName", "createdAt", "endTime", "epnumber", "id", "service", "startTime", "title", "url", "user", "userId", "userInfo" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
CREATE INDEX "Clip_userId_idx" ON "Clip"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
