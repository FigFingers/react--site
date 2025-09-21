import * as repo from "@/server/repositories/favorites";

export function listMyFavoriteClips(userId: number, opts?: Parameters<typeof repo.listFavoriteClips>[1]) {
  return repo.listFavoriteClips(userId, opts);
}

export function favoriteClip(userId: number, clipId: number) {
  return repo.addFavoriteClip(userId, clipId);
}

export function unfavoriteClip(userId: number, clipId: number) {
  return repo.removeFavoriteClip(userId, clipId);
}

export function listMyFavoritePlaylists(userId: number, opts?: Parameters<typeof repo.listFavoritePlaylists>[1]) {
  return repo.listFavoritePlaylists(userId, opts);
}

export function favoritePlaylist(userId: number, playlistId: number) {
  return repo.addFavoritePlaylist(userId, playlistId);
}

export function unfavoritePlaylist(userId: number, playlistId: number) {
  return repo.removeFavoritePlaylist(userId, playlistId);
}

