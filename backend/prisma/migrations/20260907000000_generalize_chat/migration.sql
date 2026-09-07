-- Generalize chat conversations: manager<->cashier => any user<->user within a mart
--
-- Step 1: add new generic participant columns
ALTER TABLE "chat_conversations" ADD COLUMN "user1Id" TEXT;
ALTER TABLE "chat_conversations" ADD COLUMN "user2Id" TEXT;

-- Step 2: backfill participants from existing manager/cashier pairs
-- (participants are ordered deterministically so the unique key stays stable)
UPDATE "chat_conversations"
SET "user1Id" = LEAST("managerId", "cashierId"),
    "user2Id" = GREATEST("managerId", "cashierId");

-- Step 3: deduplicate any reverse/duplicate pair (keep the row with the smallest id).
-- Messages cascade-delete with their conversation, so a duplicate can safely be dropped.
DELETE FROM "chat_conversations" a
USING "chat_conversations" b
WHERE a.id > b.id
  AND a."martId" = b."martId"
  AND a."user1Id" = b."user1Id"
  AND a."user2Id" = b."user2Id";

-- Step 4: enforce NOT NULL now that data is backfilled
ALTER TABLE "chat_conversations" ALTER COLUMN "user1Id" SET NOT NULL;
ALTER TABLE "chat_conversations" ALTER COLUMN "user2Id" SET NOT NULL;

-- Step 5: new indexes + unique constraint on the generic pair
CREATE INDEX "chat_conversations_user1Id_idx" ON "chat_conversations"("user1Id");
CREATE INDEX "chat_conversations_user2Id_idx" ON "chat_conversations"("user2Id");
CREATE UNIQUE INDEX "chat_conversations_martId_user1Id_user2Id_key"
  ON "chat_conversations"("martId", "user1Id", "user2Id");

-- Step 6: new foreign keys for the participants
ALTER TABLE "chat_conversations"
  ADD CONSTRAINT "chat_conversations_user1Id_fkey"
  FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chat_conversations"
  ADD CONSTRAINT "chat_conversations_user2Id_fkey"
  FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: drop the old manager/cashier constraints, indexes, and columns
ALTER TABLE "chat_conversations" DROP CONSTRAINT "chat_conversations_managerId_fkey";
ALTER TABLE "chat_conversations" DROP CONSTRAINT "chat_conversations_cashierId_fkey";
DROP INDEX "chat_conversations_martId_managerId_cashierId_key";
DROP INDEX "chat_conversations_managerId_idx";
DROP INDEX "chat_conversations_cashierId_idx";
ALTER TABLE "chat_conversations" DROP COLUMN "managerId";
ALTER TABLE "chat_conversations" DROP COLUMN "cashierId";