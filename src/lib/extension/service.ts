import { prisma } from "@/lib/prisma";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ValidationIssue = {
  index: number;
  field: string;
  message: string;
};

type LinkedExtensionLinkResult =
  | {
      ok: true;
      userId: string;
      extensionInstanceId: string;
    }
  | {
      ok: false;
      status: 401 | 409;
      message: "Unauthorized" | "ExtensionAlreadyLinkedToAnotherUser";
    };

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

export function normalizeExtensionLinkPayload(body: unknown) {
  if (!isRecord(body)) {
    return {
      ok: false as const,
      issues: [{ index: -1, field: "body", message: "bodyMustBeObject" }],
    };
  }
  return normalizeExtensionInstanceId(body.extensionInstanceId);
}

export function normalizeExtensionInstanceId(value: unknown) {
  const issues: ValidationIssue[] = [];
  const extensionInstanceId = normalizeUuid(
    value,
    -1,
    "extensionInstanceId",
    issues
  );

  if (issues.length > 0 || !extensionInstanceId) {
    return { ok: false as const, issues };
  }

  return { ok: true as const, extensionInstanceId };
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
}): Promise<LinkedExtensionLinkResult> {
  const user = await ensureUserExists(args.userId);
  if (!user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const existing = await prisma.linkedExtension.findUnique({
    where: { extensionInstanceId: args.extensionInstanceId },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== user.id) {
    return {
      ok: false,
      status: 409,
      message: "ExtensionAlreadyLinkedToAnotherUser",
    };
  }

  const linkedExtension = existing
    ? await prisma.linkedExtension.update({
        where: { id: existing.id },
        data: { lastUsedAt: null },
        select: { userId: true, extensionInstanceId: true },
      })
    : await prisma.linkedExtension.create({
        data: {
          userId: user.id,
          extensionInstanceId: args.extensionInstanceId,
        },
        select: { userId: true, extensionInstanceId: true },
      });

  return {
    ok: true,
    userId: linkedExtension.userId,
    extensionInstanceId: linkedExtension.extensionInstanceId,
  };
}

export async function resolveLinkedExtension(extensionInstanceId: unknown) {
  const normalized = normalizeExtensionInstanceId(extensionInstanceId);
  if (!normalized.ok) {
    return { ok: false as const, status: 400 as const, issues: normalized.issues };
  }

  const linkedExtension = await findLinkedExtensionByInstanceId(normalized.extensionInstanceId);
  if (!linkedExtension) {
    return { ok: false as const, status: 401 as const, message: "ExtensionNotLinked" as const };
  }

  return { ok: true as const, linkedExtension };
}

export async function findLinkedExtensionByInstanceId(
  extensionInstanceId: string
) {
  if (!UUID_PATTERN.test(extensionInstanceId)) {
    return null;
  }

  return prisma.linkedExtension.findUnique({
    where: { extensionInstanceId },
    select: {
      id: true,
      userId: true,
      extensionInstanceId: true,
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
}
