import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CanonicalClipInput } from "@/lib/clips/contract";
import type { ClipUserInfo } from "@/lib/clips/user";
import { resolveCurrentUserDisplayName } from "@/lib/users/displayName";

type ClipDbClient = typeof prisma | Prisma.TransactionClient;

type ClipIdentityUser = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

type LinkedExtensionOwner = {
  userId: string;
  extensionInstanceId: string;
  user?: ClipIdentityUser | null;
};

type ClipWriteOwner = {
  userId: string;
  ownerName: string;
  extensionInstanceId: string | null;
  userInfo: ClipUserInfo | null;
};

type PersistableClipInput = CanonicalClipInput & {
  createdAt?: Date | null;
};

function resolveClipOwnerDisplayName(
  user: Partial<ClipIdentityUser> | null | undefined
) {
  return resolveCurrentUserDisplayName(user);
}

export function resolveClipOwnerName(
  user: Partial<ClipIdentityUser> | null | undefined
) {
  return resolveClipOwnerDisplayName(user);
}

function buildClipUserInfo(args: {
  userId: string;
  displayName?: string | null;
  extensionInstanceId?: string | null;
}) {
  if (!args.extensionInstanceId) {
    return null;
  }

  return {
    userId: args.userId,
    displayName: args.displayName ?? null,
    extensionInstanceId: args.extensionInstanceId,
  } satisfies ClipUserInfo;
}

function buildClipWriteOwner(args: {
  userId: string;
  displayName?: string | null;
  extensionInstanceId?: string | null;
}): ClipWriteOwner {
  return {
    userId: args.userId,
    ownerName: args.displayName ?? args.userId,
    extensionInstanceId: args.extensionInstanceId ?? null,
    userInfo: buildClipUserInfo(args),
  };
}

async function findActiveLinkedExtensionForUser(
  db: ClipDbClient,
  userId: string
) {
  return db.linkedExtension.findFirst({
    where: {
      userId,
    },
    orderBy: [
      { lastUsedAt: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    select: {
      extensionInstanceId: true,
    },
  });
}

function toPrismaClipUserInfo(userInfo: ClipUserInfo) {
  return {
    userId: userInfo.userId,
    displayName: userInfo.displayName ?? null,
    extensionInstanceId: userInfo.extensionInstanceId,
  } satisfies Prisma.InputJsonObject;
}

export async function resolveClipWriteOwnerFromSessionUser(
  user: ClipIdentityUser,
  db: ClipDbClient = prisma
) {
  const [linkedExtension, dbUser] = await Promise.all([
    findActiveLinkedExtensionForUser(db, user.id),
    db.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, nickname: true, email: true },
    }),
  ]);

  return buildClipWriteOwner({
    userId: user.id,
    displayName: resolveClipOwnerDisplayName(dbUser ?? user),
    extensionInstanceId: linkedExtension?.extensionInstanceId ?? null,
  });
}

export function resolveClipWriteOwnerFromLinkedExtension(
  linkedExtension: LinkedExtensionOwner
) {
  return buildClipWriteOwner({
    userId: linkedExtension.userId,
    displayName: resolveClipOwnerDisplayName(linkedExtension.user),
    extensionInstanceId: linkedExtension.extensionInstanceId,
  });
}

function buildClipCreateData(
  clip: PersistableClipInput,
  owner: ClipWriteOwner
): Prisma.ClipUncheckedCreateInput {
  const data: Prisma.ClipUncheckedCreateInput = {
    clipName: clip.clipName ?? undefined,
    user: owner.ownerName,
    userId: owner.userId,
    extensionInstanceId: owner.extensionInstanceId ?? undefined,
    userInfo: owner.userInfo ? toPrismaClipUserInfo(owner.userInfo) : undefined,
    service: clip.service,
    startTime: clip.startTime,
    endTime: clip.endTime,
    url: clip.url,
    title: clip.title,
  };

  data.epnumber = clip.epnumber ?? undefined;

  if (clip.createdAt) {
    data.createdAt = clip.createdAt;
  }

  return data;
}

export async function createClipRecord(
  db: ClipDbClient,
  clip: PersistableClipInput,
  owner: ClipWriteOwner
) {
  return db.clip.create({ data: buildClipCreateData(clip, owner) });
}

export async function createClipRecords(
  db: ClipDbClient,
  clips: PersistableClipInput[],
  owner: ClipWriteOwner
) {
  const items = [];

  for (const clip of clips) {
    items.push(await createClipRecord(db, clip, owner));
  }

  return items;
}

export async function writeClipBatch(
  clips: PersistableClipInput[],
  owner: ClipWriteOwner
) {
  return prisma.$transaction(async function (tx) {
    return createClipRecords(tx, clips, owner);
  });
}
