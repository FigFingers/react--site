import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "@/server/http/errors";
import type {
  ExtensionLinkBody,
  ExtensionSyncBody,
} from "@/server/schemas/extension.schema";
import { buildLegacyClipCreateData } from "@/server/services/legacy-clips";

const LINK_TOKEN_TTL_MS = 10 * 60 * 1000;

type LinkedExtensionRecord = {
  id: number;
  userId: number;
  extensionInstanceId: string;
  extensionAuthHash: string;
  revokedAt: Date | null;
};

export async function issueExtensionLinkToken(userId: number) {
  const linkToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(linkToken);
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

  await prisma.$executeRaw`
    INSERT INTO extension_link_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;

  return { linkToken, expiresAt };
}

export async function consumeLinkTokenAndLinkExtension(
  input: ExtensionLinkBody,
) {
  const tokenHash = hashOpaqueToken(input.linkToken);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const records = await tx.$queryRaw<
      Array<{
        id: number;
        userId: number;
        expiresAt: Date;
        usedAt: Date | null;
      }>
    >`
      SELECT
        id,
        user_id AS "userId",
        expires_at AS "expiresAt",
        used_at AS "usedAt"
      FROM extension_link_tokens
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;

    const tokenRecord = records[0];
    if (!tokenRecord) throw new UnauthorizedError("Invalid link token");
    if (tokenRecord.usedAt) throw new ConflictError("Link token already used");
    if (tokenRecord.expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestError("Link token expired", "LINK_TOKEN_EXPIRED");
    }

    const consumed = await tx.$queryRaw<Array<{ id: number }>>`
      UPDATE extension_link_tokens
      SET used_at = ${now}
      WHERE id = ${tokenRecord.id} AND used_at IS NULL
      RETURNING id
    `;

    if (consumed.length !== 1) {
      throw new ConflictError("Link token already used");
    }

    const extensionAuthToken = generateOpaqueToken();
    const extensionAuthHash = hashOpaqueToken(extensionAuthToken);

    await tx.$executeRaw`
      INSERT INTO linked_extensions (
        user_id,
        extension_instance_id,
        extension_auth_hash,
        linked_at,
        last_seen_at,
        revoked_at
      )
      VALUES (
        ${tokenRecord.userId},
        ${input.extensionInstanceId}::uuid,
        ${extensionAuthHash},
        ${now},
        ${now},
        NULL
      )
      ON CONFLICT (extension_instance_id) WHERE revoked_at IS NULL
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        extension_auth_hash = EXCLUDED.extension_auth_hash,
        linked_at = EXCLUDED.linked_at,
        last_seen_at = EXCLUDED.last_seen_at,
        revoked_at = NULL
    `;

    return { extensionAuthToken };
  });
}

export async function syncExtensionItems(
  extensionInstanceId: string,
  extensionAuthToken: string,
  body: ExtensionSyncBody,
) {
  const linkedExtension = await authenticateLinkedExtension(
    extensionInstanceId,
    extensionAuthToken,
  );

  const acceptedItemIds: string[] = [];
  const now = new Date();
  const clipInputs = await Promise.all(
    body.items.map(async (item) => ({
      clientItemId: item.clientItemId,
      type: item.type,
      createdAt: item.createdAt,
      data: await buildLegacyClipCreateData(item.payload),
    })),
  );

  await prisma.$transaction(async (tx) => {
    const existingReceipts =
      clipInputs.length === 0
        ? []
        : await tx.$queryRaw<Array<{ clientItemId: string }>>`
            SELECT client_item_id AS "clientItemId"
            FROM sync_receipts
            WHERE linked_extension_id = ${linkedExtension.id}
              AND client_item_id = ANY(${clipInputs.map((item) => item.clientItemId)}::uuid[])
          `;

    const receiptIds = new Set(
      existingReceipts.map((item) => item.clientItemId),
    );

    for (const item of clipInputs) {
      if (receiptIds.has(item.clientItemId)) {
        acceptedItemIds.push(item.clientItemId);
        continue;
      }

      try {
        await tx.$executeRaw`
          INSERT INTO sync_receipts (linked_extension_id, client_item_id, item_type)
          VALUES (${linkedExtension.id}, ${item.clientItemId}::uuid, ${item.type})
        `;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          acceptedItemIds.push(item.clientItemId);
          continue;
        }

        throw error;
      }

      await tx.clip.create({
        data: {
          userId: linkedExtension.userId,
          ...item.data,
          ...(item.createdAt ? { createdAt: item.createdAt } : {}),
        },
      });
      receiptIds.add(item.clientItemId);
      acceptedItemIds.push(item.clientItemId);
    }

    await tx.$executeRaw`
      UPDATE linked_extensions
      SET last_seen_at = ${now}
      WHERE id = ${linkedExtension.id}
    `;
  });

  return { acceptedItemIds };
}

export function parseBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function authenticateLinkedExtension(
  extensionInstanceId: string,
  extensionAuthToken: string,
) {
  const records = await prisma.$queryRaw<Array<LinkedExtensionRecord>>`
    SELECT
      id,
      user_id AS "userId",
      extension_instance_id AS "extensionInstanceId",
      extension_auth_hash AS "extensionAuthHash",
      revoked_at AS "revokedAt"
    FROM linked_extensions
    WHERE extension_instance_id = ${extensionInstanceId}::uuid
    LIMIT 1
  `;

  const linkedExtension = records[0];
  if (!linkedExtension || linkedExtension.revokedAt) {
    throw new UnauthorizedError("Unauthorized");
  }

  if (
    !tokenHashMatches(extensionAuthToken, linkedExtension.extensionAuthHash)
  ) {
    throw new UnauthorizedError("Unauthorized");
  }

  return linkedExtension;
}

function generateOpaqueToken(size = 32) {
  return randomBytes(size).toString("base64url");
}

function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenHashMatches(token: string, expectedHash: string) {
  const actualHash = hashOpaqueToken(token);
  if (actualHash.length !== expectedHash.length) return false;

  return timingSafeEqual(
    Buffer.from(actualHash, "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}
