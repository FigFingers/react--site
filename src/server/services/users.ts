import { ForbiddenError, NotFoundError } from "@/server/http/errors";
import * as repo from "@/server/repositories/users";

export function listUsers(opts: Parameters<typeof repo.list>[0]) {
  return repo.list(opts);
}

export async function getUser(id: number) {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export function createUser(data: Parameters<typeof repo.create>[0]) {
  return repo.create(data);
}

export function updateUser(
  currentUserId: number,
  id: number,
  data: Parameters<typeof repo.update>[1],
) {
  if (currentUserId !== id) throw new ForbiddenError();
  return repo.update(id, data);
}

export function deleteUser(currentUserId: number, id: number, hard = false) {
  if (currentUserId !== id) throw new ForbiddenError();
  return hard ? repo.hardDelete(id) : repo.softDelete(id);
}
