ALTER TABLE "Clip" ADD COLUMN "extensionInstanceId" TEXT;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_LinkedExtension" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "extensionInstanceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "LinkedExtension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_LinkedExtension" ("id", "userId", "extensionInstanceId", "tokenHash", "createdAt", "updatedAt", "lastUsedAt")
SELECT "id", "userId", "extensionInstanceId", "tokenHash", "createdAt", COALESCE("lastUsedAt", "createdAt", CURRENT_TIMESTAMP), "lastUsedAt"
FROM "LinkedExtension";

DROP TABLE "LinkedExtension";

ALTER TABLE "new_LinkedExtension" RENAME TO "LinkedExtension";

CREATE UNIQUE INDEX "LinkedExtension_extensionInstanceId_key" ON "LinkedExtension"("extensionInstanceId");
CREATE INDEX "LinkedExtension_userId_idx" ON "LinkedExtension"("userId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE INDEX "Clip_extensionInstanceId_idx" ON "Clip"("extensionInstanceId");
