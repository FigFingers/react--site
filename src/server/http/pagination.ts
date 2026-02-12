const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGE_SIZE = 100;

export interface PaginationInit {
  page?: number | string | null;
  pageSize?: number | string | null;
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  outOfRange: boolean;
}

export function parsePagination(init: PaginationInit = {}): PaginationParams {
  const defaultPage = clampInt(toNumber(init.defaultPage, DEFAULT_PAGE), 1);
  const defaultPageSize = clampInt(
    toNumber(init.defaultPageSize, DEFAULT_PAGE_SIZE),
    1,
  );
  const maxPageSize = clampInt(
    toNumber(init.maxPageSize, DEFAULT_MAX_PAGE_SIZE),
    1,
  );

  const page = clampInt(toNumber(init.page, defaultPage), 1);
  const rawPageSize = clampInt(toNumber(init.pageSize, defaultPageSize), 1);
  const pageSize = Math.min(rawPageSize, maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginationMeta(
  { page, pageSize }: PaginationParams,
  total: number,
): PaginationMeta {
  const safeTotal = Math.max(0, Math.floor(total));
  const totalPages = pageSize > 0 ? Math.ceil(safeTotal / pageSize) : 0;
  const outOfRange = totalPages > 0 && page > totalPages;

  return {
    page,
    pageSize,
    total: safeTotal,
    totalPages,
    hasPrev: totalPages > 0 && page > 1,
    hasNext: totalPages > 0 && page < totalPages,
    outOfRange,
  };
}

function toNumber(
  value: number | string | null | undefined,
  fallback: number,
): number {
  if (typeof value === "number" && Number.isFinite(value))
    return Number.isInteger(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = value.trim();
    if (!/^-?\d+$/.test(normalized)) return fallback;
    const parsed = Number.parseInt(normalized, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clampInt(value: number, min: number): number {
  const normalized = Math.floor(value);
  return normalized < min ? min : normalized;
}
