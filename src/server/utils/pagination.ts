export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PageOpts = {
  page?: number;
  pageSize?: number;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function normalizePaging(opts: PageOpts = {}) {
  const rawPage = opts.page ?? DEFAULT_PAGE;
  const rawPageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;

  const page = Math.max(1, Math.floor(rawPage));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(rawPageSize)),
  );

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}

export function makePageMeta<T>(args: {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}): Paginated<T> {
  const { data, total, page, pageSize } = args;
  const hasMore = page * pageSize < total;
  return { data, total, page, pageSize, hasMore };
}
