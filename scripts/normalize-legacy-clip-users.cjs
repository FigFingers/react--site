const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const shouldWrite = process.argv.includes("--write");

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeHandle(value) {
  const text = normalizeText(value);
  return text ? text.toLowerCase() : null;
}

function getEmailLocalPart(email) {
  const text = normalizeText(email);
  if (!text || !text.includes("@")) {
    return null;
  }

  return text.split("@", 1)[0].toLowerCase();
}

function chooseLatestActiveLinkedExtension(linkedExtensions) {
  const active = linkedExtensions.filter((item) => item.revokedAt === null);
  active.sort(function compare(a, b) {
    const aLastSeen = new Date(a.lastSeenAt).getTime();
    const bLastSeen = new Date(b.lastSeenAt).getTime();
    if (aLastSeen !== bLastSeen) {
      return bLastSeen - aLastSeen;
    }

    const aLinkedAt = new Date(a.linkedAt).getTime();
    const bLinkedAt = new Date(b.linkedAt).getTime();
    return bLinkedAt - aLinkedAt;
  });

  return active[0] ?? null;
}

function buildClipUserInfo(user, linkedExtension) {
  if (!linkedExtension) {
    return null;
  }

  return {
    userId: user.id,
    displayName: normalizeText(user.name),
    extensionInstanceId: linkedExtension.extensionInstanceId,
  };
}

function buildLegacyHandleMap(users) {
  const map = new Map();

  for (const user of users) {
    const candidateHandles = new Set();
    const emailLocalPart = getEmailLocalPart(user.email);
    const nickname = normalizeHandle(user.nickname);
    const nicknameNorm = normalizeHandle(user.nicknameNorm);

    if (emailLocalPart) {
      candidateHandles.add(emailLocalPart);
      const shortPrefix = emailLocalPart.match(/^[a-z]+/);
      if (shortPrefix && shortPrefix[0].length >= 3) {
        candidateHandles.add(shortPrefix[0]);
      }
    }
    if (nickname) {
      candidateHandles.add(nickname);
    }
    if (nicknameNorm) {
      candidateHandles.add(nicknameNorm);
    }

    for (const handle of candidateHandles) {
      if (!map.has(handle)) {
        map.set(handle, []);
      }
      map.get(handle).push(user);
    }
  }

  for (const candidates of map.values()) {
    candidates.sort(function compare(a, b) {
      if (a.playlists.length !== b.playlists.length) {
        return b.playlists.length - a.playlists.length;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  return map;
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      nicknameNorm: true,
      createdAt: true,
      playlists: {
        select: {
          id: true,
        },
      },
      linkedExtensions: {
        select: {
          extensionInstanceId: true,
          revokedAt: true,
          linkedAt: true,
          lastSeenAt: true,
        },
      },
    },
  });

  const userById = new Map(users.map((user) => [user.id, user]));
  const legacyHandleMap = buildLegacyHandleMap(users);

  const clips = await prisma.clip.findMany({
    select: {
      id: true,
      user: true,
      userId: true,
      userInfo: true,
      playlistClips: {
        select: {
          playlist: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const updates = [];
  const summary = {
    totalClips: clips.length,
    updatedCandidates: 0,
    writeMode: shouldWrite,
    reasons: {
      alreadyCanonical: 0,
      playlistOwner: 0,
      legacyHandle: 0,
      unchangedAmbiguous: 0,
      unchangedNoMatch: 0,
    },
    byLegacyUser: {},
  };

  for (const clip of clips) {
    const legacyUser = clip.user;
    if (!summary.byLegacyUser[legacyUser]) {
      summary.byLegacyUser[legacyUser] = {
        total: 0,
        updated: 0,
        unchanged: 0,
      };
    }
    summary.byLegacyUser[legacyUser].total += 1;

    if (clip.userId) {
      const currentUser = userById.get(clip.userId);
      if (!currentUser) {
        summary.reasons.unchangedNoMatch += 1;
        summary.byLegacyUser[legacyUser].unchanged += 1;
        continue;
      }

      const displayName = normalizeText(currentUser.name);
      const linkedExtension = chooseLatestActiveLinkedExtension(currentUser.linkedExtensions);
      const nextUserInfo = buildClipUserInfo(currentUser, linkedExtension);
      const nextUser = displayName ?? clip.user;
      const sameUser = clip.user === nextUser;
      const sameUserInfo = JSON.stringify(clip.userInfo) === JSON.stringify(nextUserInfo);

      if (sameUser && sameUserInfo) {
        summary.reasons.alreadyCanonical += 1;
        summary.byLegacyUser[legacyUser].unchanged += 1;
        continue;
      }

      updates.push({
        clipId: clip.id,
        data: {
          user: nextUser,
          userId: currentUser.id,
          userInfo: nextUserInfo,
        },
        reason: "alreadyCanonical",
      });
      summary.updatedCandidates += 1;
      summary.byLegacyUser[legacyUser].updated += 1;
      continue;
    }

    const playlistOwnerIds = [
      ...new Set(clip.playlistClips.map((item) => item.playlist.userId)),
    ];

    let targetUser = null;
    let reason = null;

    if (playlistOwnerIds.length === 1) {
      targetUser = userById.get(playlistOwnerIds[0]) ?? null;
      reason = targetUser ? "playlistOwner" : null;
    }

    if (!targetUser) {
      const candidates = legacyHandleMap.get(normalizeHandle(clip.user)) ?? [];
      targetUser = candidates[0] ?? null;
      reason = targetUser ? "legacyHandle" : null;
    }

    if (!targetUser) {
      summary.reasons.unchangedNoMatch += 1;
      summary.byLegacyUser[legacyUser].unchanged += 1;
      continue;
    }

    if (playlistOwnerIds.length > 1) {
      summary.reasons.unchangedAmbiguous += 1;
      summary.byLegacyUser[legacyUser].unchanged += 1;
      continue;
    }

    const displayName = normalizeText(targetUser.name);
    const linkedExtension = chooseLatestActiveLinkedExtension(targetUser.linkedExtensions);
    updates.push({
      clipId: clip.id,
      data: {
        user: displayName ?? clip.user,
        userId: targetUser.id,
        userInfo: buildClipUserInfo(targetUser, linkedExtension),
      },
      reason,
    });
    summary.updatedCandidates += 1;
    summary.reasons[reason] += 1;
    summary.byLegacyUser[legacyUser].updated += 1;
  }

  if (shouldWrite && updates.length > 0) {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.clip.update({
          where: { id: update.clipId },
          data: update.data,
        })
      )
    );
  }

  const output = {
    summary,
    preview: updates.slice(0, 10),
    legacyHandleCandidates: Object.fromEntries(
      [...legacyHandleMap.entries()].map(([handle, candidates]) => [
        handle,
        candidates.map((candidate) => ({
          id: candidate.id,
          email: candidate.email,
          name: candidate.name,
          playlistCount: candidate.playlists.length,
        })),
      ])
    ),
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
