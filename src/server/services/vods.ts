import { NotFoundError } from "@/server/http/errors";
import * as repo from "@/server/repositories/vods";

export function listVods(opts: Parameters<typeof repo.list>[0]) {
  return repo.list(opts);
}

export async function getVod(id: number) {
  const vod = await repo.findById(id);
  if (!vod) throw new NotFoundError("VOD not found");
  return vod;
}

export function createVod(data: Parameters<typeof repo.create>[0]) {
  return repo.create(data);
}

export async function updateVod(
  id: number,
  data: Parameters<typeof repo.update>[1],
) {
  await getVod(id);
  return repo.update(id, data);
}

export async function deleteVod(id: number, hard = false) {
  await getVod(id);
  return hard ? repo.hardDelete(id) : repo.softDelete(id);
}

export function listVodAliases(
  vodId: number,
  opts?: Parameters<typeof repo.listAliases>[1],
) {
  return repo.listAliases(vodId, opts);
}

export function createVodAlias(vodId: number, alias: string) {
  return repo.createAlias(vodId, alias);
}

export function updateVodAlias(
  aliasId: number,
  data: Parameters<typeof repo.updateAlias>[1],
) {
  return repo.updateAlias(aliasId, data);
}

export function deleteVodAlias(aliasId: number) {
  return repo.deleteAlias(aliasId);
}
