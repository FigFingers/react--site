import { ForbiddenError, NotFoundError } from "@/server/http/errors";
import * as repo from "@/server/repositories/clips";

export function listClips(opts: Parameters<typeof repo.list>[0]) {
  return repo.list(opts);
}

export function listClipsCursor(opts: Parameters<typeof repo.listCursor>[0]) {
  return repo.listCursor(opts);
}

export async function getClip(id: number) {
  const clip = await repo.findById(id);
  if (!clip) throw new NotFoundError("Clip not found");
  return clip;
}

export function createClip(
  currentUserId: number,
  data: Omit<Parameters<typeof repo.create>[0], "userId">,
) {
  return repo.create({ ...data, userId: currentUserId });
}

export async function updateClip(
  currentUserId: number,
  id: number,
  data: Parameters<typeof repo.update>[1],
) {
  const clip = await getClip(id);
  if (String(clip.userId) !== String(currentUserId)) throw new ForbiddenError();
  return repo.update(id, data);
}

export async function deleteClip(
  currentUserId: number,
  id: number,
  hard = false,
) {
  const clip = await getClip(id);
  if (String(clip.userId) !== String(currentUserId)) throw new ForbiddenError();
  return hard ? repo.hardDelete(id) : repo.softDelete(id);
}

export function incrementClipViews(id: number, by = 1n) {
  return repo.incrementViews(id, by).then((result) => {
    if (result.count === 0) throw new NotFoundError("Clip not found");
  });
}
