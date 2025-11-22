export interface SoftDeleteFlags {
  includeDeleted: boolean;
  hardDelete: boolean;
}

export function parseSoftDeleteFlags(
  params: { includeDeleted?: unknown; hard?: unknown },
  defaults: Partial<SoftDeleteFlags> = {},
): SoftDeleteFlags {
  return {
    includeDeleted: toBoolean(
      params.includeDeleted,
      defaults.includeDeleted ?? false,
    ),
    hardDelete: toBoolean(params.hard, defaults.hardDelete ?? false),
  };
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes")
      return true;
    if (normalized === "false" || normalized === "0" || normalized === "no")
      return false;
  }
  return fallback;
}

export function softDeleteFilter(includeDeleted: boolean) {
  return includeDeleted ? {} : { deletedAt: null };
}
