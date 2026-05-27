import type { NextRequest } from "next/server";
import type { z } from "zod";

import { BadRequestError } from "@/server/http/errors";

export function parseSearchParams<T>(
  params: URLSearchParams,
  schema: z.ZodSchema<T>,
): T {
  const result = schema.safeParse(Object.fromEntries(params.entries()));
  if (!result.success)
    throw new BadRequestError(
      "Invalid query parameters",
      "INVALID_QUERY",
      result.error.flatten((issue) => issue.message),
    );
  return result.data;
}

export function parseRouteParams<T>(
  params: Record<string, unknown>,
  schema: z.ZodSchema<T>,
): T {
  const result = schema.safeParse(params);
  if (!result.success)
    throw new BadRequestError(
      "Invalid route params",
      "INVALID_PARAMS",
      result.error.flatten((issue) => issue.message),
    );
  return result.data;
}

export async function parseJsonBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<T> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch (error) {
    throw new BadRequestError(
      "Invalid JSON body",
      "INVALID_JSON",
      error instanceof Error ? error.message : error,
    );
  }
  const result = schema.safeParse(payload);
  if (!result.success)
    throw new BadRequestError(
      "Invalid request body",
      "INVALID_BODY",
      result.error.flatten((issue) => issue.message),
    );
  return result.data;
}
