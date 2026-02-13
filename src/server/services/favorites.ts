import { ConflictError, NotFoundError } from "@/server/http/errors";
import * as repo from "@/server/repositories/favorites";

export function listMyFavoriteClips(
  userId: number,
  opts?: Parameters<typeof repo.listFavoriteClips>[1],
) {
  return repo.listFavoriteClips(userId, opts);
}

export async function favoriteClip(userId: number, clipId: number) {
  const result = await repo.addFavoriteClipIfClipActive(userId, clipId);
  if (!result.active_exists) throw new NotFoundError("Clip not found");
  if (!result.inserted) throw new ConflictError("Already favorited");
}

export function unfavoriteClip(userId: number, clipId: number) {
  return repo.removeFavoriteClip(userId, clipId);
}

export function listMyFavoritePlaylists(
  userId: number,
  opts?: Parameters<typeof repo.listFavoritePlaylists>[1],
) {
  return repo.listFavoritePlaylists(userId, opts);
}

export async function favoritePlaylist(userId: number, playlistId: number) {
  const result = await repo.addFavoritePlaylistIfActive(userId, playlistId);
  if (!result.active_exists) throw new NotFoundError("Playlist not found");
  if (!result.inserted) throw new ConflictError("Already favorited");
}

export function unfavoritePlaylist(userId: number, playlistId: number) {
  return repo.removeFavoritePlaylist(userId, playlistId);
}
