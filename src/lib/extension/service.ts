import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  type CanonicalClipInput,
  normalizeClipBatchPayload,
} from "@/lib/clips/contract";

const EXTENSION_AUTH_TOKEN_BYTES = 32;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ValidationIssue = {
  index: number;
  field: string;
  message: string;
};

type LinkedExtensionAuthResult =
  | {
      ok: true;
      linkedExtension: {
        id: string;
        userId: string;
        extensionInstanceId: string;
        user: {
          id: string;
          name: string | null;
          nickname: string | null;
          email: string | null;
        } | null;
      };
    }
  | { ok: false; status: 401; message: "Unauthorized" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(
  value: unknown,
  index: number,
  field: string,
  issues: ValidationIssue[]
) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    issues.push({ index, field, message: `${field}IsRequired` });
    return null;
  }
  return text;
}

function normalizeUuid(
  value: unknown,
  index: number,
  field: string,
  issues: ValidationIssue[]
) {
  const text = normalizeRequiredString(value, index, field, issues);
  if (!text) return null;

  if (!UUID_PATTERN.test(text)) {
    issues.push({ index, field, message: `${field}MustBeUuid` });
    return null;
  }

  return text;
}

function tokenHashMatches(token: string, expectedHash: string) {
  const actualHash = hashExtensionAuthToken(token);
  if (actualHash.length !== expectedHash.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(actualHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

export function generateExtensionAuthToken() {
  return randomBytes(EXTENSION_AUTH_TOKEN_BYTES).toString("base64url");
}

export function hashExtensionAuthToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function parseBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.trim().match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  return token || null;
}

export function normalizeExtensionLinkPayload(body: unknown) {
  if (!isRecord(body)) {
    return {
      ok: false as const,
      issues: [{ index: -1, field: "body", message: "bodyMustBeObject" }],
    };
  }

  const issues: ValidationIssue[] = [];
  const extensionInstanceId = normalizeUuid(
    body.extensionInstanceId,
    -1,
    "extensionInstanceId",
    issues
  );

  if (issues.length > 0 || !extensionInstanceId) {
    return { ok: false as const, issues };
  }

  return { ok: true as const, extensionInstanceId };
}

export function normalizeExtensionSyncPayload(body: unknown) {
  if (!isRecord(body)) {
    return {
      ok: false as const,
      issues: [{ index: -1, field: "body", message: "bodyMustBeObject" }],
    };
  }

  const issues: ValidationIssue[] = [];
  const extensionInstanceId = normalizeUuid(
    body.extensionInstanceId,
    -1,
    "extensionInstanceId",
    issues
  );

  if (!Array.isArray(body.clips)) {
    issues.push({ index: -1, field: "clips", message: "clipsMustBeArray" });
  }

  const items: Array<{
    clientItemId: string;
    type: "clip";
    payload: CanonicalClipInput;
  }> = [];

  if (Array.isArray(body.clips)) {
    for (let index = 0; index < body.clips.length; index += 1) {
      const rawClip = body.clips[index];
      if (!isRecord(rawClip)) {
        issues.push({ index, field: "clips", message: "clipMustBeObject" });
        continue;
      }

      const clientItemId = normalizeRequiredString(
        rawClip.clientItemId,
        index,
        "clientItemId",
        issues
      );
      const normalizedPayload = normalizeClipBatchPayload(rawClip);

      if (normalizedPayload.ok === false) {
        for (const issue of normalizedPayload.issues) {
          issues.push({
            index,
            field: issue.field,
            message: issue.message,
          });
        }
        continue;
      }

      if (normalizedPayload.clips.length !== 1) {
        issues.push({
          index,
          field: "clip",
          message: "clipMustContainExactlyOneClip",
        });
        continue;
      }

      if (clientItemId) {
        items.push({
          clientItemId,
          type: "clip",
          payload: normalizedPayload.clips[0],
        });
      }
    }
  }

  if (issues.length > 0 || !extensionInstanceId) {
    return { ok: false as const, issues };
  }

  return { ok: true as const, extensionInstanceId, items };
}

async function ensureUserExists(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
}

export async function linkExtensionInstanceToUser(args: {
  userId: string;
  extensionInstanceId: string;
}) {
  const user = await ensureUserExists(args.userId);
  if (!user) return null;

  const extensionAuthToken = generateExtensionAuthToken();
  const tokenHash = hashExtensionAuthToken(extensionAuthToken);

  await prisma.linkedExtension.upsert({
    where: { extensionInstanceId: args.extensionInstanceId },
    update: {
      userId: user.id,
      tokenHash,
      lastUsedAt: null,
    },
    create: {
      userId: user.id,
      extensionInstanceId: args.extensionInstanceId,
      tokenHash,
    },
  });

  return { extensionAuthToken };
}

export async function authenticateLinkedExtension(args: {
  extensionInstanceId: string;
  extensionAuthToken: string;
}): Promise<LinkedExtensionAuthResult> {
  if (!UUID_PATTERN.test(args.extensionInstanceId) || !args.extensionAuthToken) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const linkedExtension = await prisma.linkedExtension.findUnique({
    where: { extensionInstanceId: args.extensionInstanceId },
    select: {
      id: true,
      userId: true,
      extensionInstanceId: true,
      tokenHash: true,
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
        },
      },
    },
  });

  if (!linkedExtension) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  if (!tokenHashMatches(args.extensionAuthToken, linkedExtension.tokenHash)) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return {
    ok: true,
    linkedExtension: {
      id: linkedExtension.id,
      userId: linkedExtension.userId,
      extensionInstanceId: linkedExtension.extensionInstanceId,
      user: linkedExtension.user,
    },
  };
}

export async function authenticateExtensionAuthToken(
  extensionAuthToken: string,
  extensionInstanceId?: string | null
) {
  if (!extensionInstanceId) {
    return { ok: false as const, status: 401 as const, message: "Unauthorized" };
  }

  return authenticateLinkedExtension({ extensionInstanceId, extensionAuthToken });
}

