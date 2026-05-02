PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_LinkedExtension" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "extensionInstanceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "LinkedExtension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_LinkedExtension" ("id", "userId", "extensionInstanceId", "tokenHash", "createdAt", "lastUsedAt")
SELECT CAST("id" AS TEXT), "userId", "extensionInstanceId", "extensionAuthHash", "linkedAt", "lastSeenAt"
FROM "LinkedExtension"
WHERE "revokedAt" IS NULL;

CREATE TABLE "new_SyncReceipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "linkedExtensionId" TEXT NOT NULL,
    "clientItemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncReceipt_linkedExtensionId_fkey" FOREIGN KEY ("linkedExtensionId") REFERENCES "LinkedExtension" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_SyncReceipt" ("id", "linkedExtensionId", "clientItemId", "itemType", "createdAt")
SELECT "id", CAST("linkedExtensionId" AS TEXT), "clientItemId", "itemType", "createdAt"
FROM "SyncReceipt"
WHERE CAST("linkedExtensionId" AS TEXT) IN (SELECT "id" FROM "new_LinkedExtension");

DROP TABLE "SyncReceipt";
DROP TABLE "LinkedExtension";

ALTER TABLE "new_LinkedExtension" RENAME TO "LinkedExtension";
ALTER TABLE "new_SyncReceipt" RENAME TO "SyncReceipt";

CREATE UNIQUE INDEX "LinkedExtension_extensionInstanceId_key" ON "LinkedExtension"("extensionInstanceId");
CREATE INDEX "LinkedExtension_userId_idx" ON "LinkedExtension"("userId");
CREATE UNIQUE INDEX "SyncReceipt_linkedExtensionId_clientItemId_key" ON "SyncReceipt"("linkedExtensionId", "clientItemId");
CREATE INDEX "SyncReceipt_linkedExtensionId_createdAt_idx" ON "SyncReceipt"("linkedExtensionId", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
