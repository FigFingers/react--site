import type { Prisma } from "@prisma/client";

type SortOrder = Prisma.SortOrder;

export type SortMapper<T> = string | ((direction: SortOrder) => T);

export type SortConfig<T> = Record<string, SortMapper<T>>;

export function parseSort<T>(
  value: string | null | undefined,
  config: SortConfig<T>,
  fallback: T[] = [],
): T[] {
  if (!value) return fallback;
  const parts = value.split(",");
  const seen = new Set<string>();
  const result: T[] = [];

  for (const raw of parts) {
    const [fieldRaw, dirRaw] = raw.split(":");
    const field = fieldRaw?.trim();
    if (!field || seen.has(field)) continue;
    const mapper = config[field];
    if (!mapper) continue;

    const direction = normalizeSortDirection(dirRaw);
    result.push(applyMapper(mapper, direction));
    seen.add(field);
  }

  return result.length > 0 ? result : fallback;
}

export function normalizeSortDirection(
  value: string | null | undefined,
): SortOrder {
  const lower = value?.toLowerCase();
  return lower === "desc" ? "desc" : "asc";
}

export function fieldSorter(
  field: string,
): SortMapper<Record<string, SortOrder>> {
  return field;
}

function applyMapper<T>(mapper: SortMapper<T>, direction: SortOrder): T {
  if (typeof mapper === "string") {
    return { [mapper]: direction } as unknown as T;
  }
  return mapper(direction);
}
