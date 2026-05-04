-- Remove tokenHash from LinkedExtension
ALTER TABLE "LinkedExtension" DROP COLUMN "tokenHash";

-- Drop SyncReceipt table
DROP TABLE "SyncReceipt";
