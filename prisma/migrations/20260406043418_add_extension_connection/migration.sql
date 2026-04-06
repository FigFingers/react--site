-- CreateTable
CREATE TABLE "LinkedExtension" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "extensionInstanceId" TEXT NOT NULL,
    "extensionAuthHash" TEXT NOT NULL,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "LinkedExtension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExtensionLinkToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtensionLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncReceipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "linkedExtensionId" INTEGER NOT NULL,
    "clientItemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncReceipt_linkedExtensionId_fkey" FOREIGN KEY ("linkedExtensionId") REFERENCES "LinkedExtension" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clipName" TEXT,
    "user" TEXT NOT NULL,
    "userId" TEXT,
    "service" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "epnumber" TEXT NOT NULL DEFAULT 'エピソード不明',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Clip" ("clipName", "createdAt", "endTime", "epnumber", "id", "service", "startTime", "title", "url", "user") SELECT "clipName", "createdAt", "endTime", "epnumber", "id", "service", "startTime", "title", "url", "user" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
CREATE INDEX "Clip_userId_idx" ON "Clip"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LinkedExtension_extensionInstanceId_key" ON "LinkedExtension"("extensionInstanceId");

-- CreateIndex
CREATE INDEX "LinkedExtension_userId_revokedAt_idx" ON "LinkedExtension"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionLinkToken_tokenHash_key" ON "ExtensionLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ExtensionLinkToken_userId_expiresAt_idx" ON "ExtensionLinkToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "SyncReceipt_linkedExtensionId_createdAt_idx" ON "SyncReceipt"("linkedExtensionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncReceipt_linkedExtensionId_clientItemId_key" ON "SyncReceipt"("linkedExtensionId", "clientItemId");
