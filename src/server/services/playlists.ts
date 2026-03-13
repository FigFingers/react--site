import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/http/errors";
import * as repo from "@/server/repositories/playlists";

export function listPlaylists(opts: Parameters<typeof repo.list>[0]) {
  return repo.list(opts);
}

export function listPlaylistsCursor(
  opts?: Parameters<typeof repo.listCursor>[0],
) {
  return repo.listCursor(opts);
}

export async function getPlaylist(id: number) {
  const playlist = await repo.findById(id);
  if (!playlist) throw new NotFoundError("Playlist not found");
  return playlist;
}

export function createPlaylist(
  currentUserId: number,
  data: Omit<Parameters<typeof repo.create>[0], "userId">,
) {
  return repo.create({ ...data, userId: currentUserId });
}

export async function updatePlaylist(
  currentUserId: number,
  id: number,
  data: Parameters<typeof repo.update>[1],
) {
  const playlist = await getPlaylist(id);
  if (playlist.userId !== currentUserId) throw new ForbiddenError();
  return repo.update(id, data);
}

export async function deletePlaylist(
  currentUserId: number,
  id: number,
  hard = false,
) {
  const playlist = await getPlaylist(id);
  if (playlist.userId !== currentUserId) throw new ForbiddenError();
  return hard ? repo.hardDelete(id) : repo.softDelete(id);
}

export async function addClipToPlaylist(
  currentUserId: number,
  playlistId: number,
  clipId: number,
) {
  const playlist = await getPlaylist(playlistId);
  if (playlist.userId !== currentUserId) throw new ForbiddenError();
  const result = await repo.addClipIfActive(playlistId, clipId);
  if (!result.active_exists) throw new NotFoundError("Clip not found");
}

export async function removeClipFromPlaylist(
  currentUserId: number,
  playlistId: number,
  clipId: number,
) {
  const playlist = await getPlaylist(playlistId);
  if (playlist.userId !== currentUserId) throw new ForbiddenError();
  return repo.removeClip(playlistId, clipId);
}

export function listPlaylistClips(
  playlistId: number,
  opts?: Parameters<typeof repo.listClips>[1],
) {
  return repo.listClips(playlistId, opts);
}

export async function addVodToPlaylist(
  currentUserId: number,
  playlistId: number,
  vodId: number,
) {
  const playlist = await getPlaylist(playlistId);
  if (playlist.userId !== currentUserId) throw new ForbiddenError();
  const result = await repo.addVodIfActive(playlistId, vodId);
  if (!result.active_exists) throw new NotFoundError("VOD not found");
  if (!result.inserted) throw new ConflictError("VOD already attached");
}

export async function removeVodFromPlaylist(
  currentUserId: number,
  playlistId: number,
  vodId: number,
) {
  const playlist = await getPlaylist(playlistId);
  if (playlist.userId !== currentUserId) throw new ForbiddenError();
  return repo.removeVod(playlistId, vodId);
}

export function listPlaylistVods(
  playlistId: number,
  opts?: Parameters<typeof repo.listVods>[1],
) {
  return repo.listVods(playlistId, opts);
}
