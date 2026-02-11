import { Prisma } from "@prisma/client";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends HttpError {
  constructor(
    message = "Bad request",
    code = "BAD_REQUEST",
    details?: unknown,
  ) {
    super(400, message, code, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(
    // biome-ignore lint/security/noSecrets: There is no confidential data.
    message = "Authentication required",
    code = "UNAUTHORIZED",
    details?: unknown,
  ) {
    super(401, message, code, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Not allowed", code = "FORBIDDEN", details?: unknown) {
    super(403, message, code, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(
    message = "Resource not found",
    code = "NOT_FOUND",
    details?: unknown,
  ) {
    super(404, message, code, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict", code = "CONFLICT", details?: unknown) {
    super(409, message, code, details);
  }
}

export function toErrorPayload(err: unknown): {
  status: number;
  body: { message: string; code?: string; details?: JsonValue };
} {
  if (err instanceof HttpError) {
    const details = sanitizeJson(err.details);
    return {
      status: err.status,
      body: { message: err.message, code: err.code, details },
    };
  }

  const prismaMapped = mapPrismaError(err);
  if (prismaMapped) {
    const details = sanitizeJson(prismaMapped.details);
    return {
      status: prismaMapped.status,
      body: {
        message: prismaMapped.message,
        code: prismaMapped.code,
        details,
      },
    };
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  return { status: 500, body: { message, code: "INTERNAL_ERROR" } };
}

function mapPrismaError(err: unknown): HttpError | null {
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestError(
      "Invalid database query",
      "PRISMA_VALIDATION_ERROR",
    );
  }

  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (err.code) {
    case "P2000":
    case "P2006":
    case "P2011":
      return new BadRequestError("Invalid input", err.code, {
        prismaCode: err.code,
        meta: err.meta,
      });
    case "P2002":
      return new ConflictError("Unique constraint violation", err.code, {
        prismaCode: err.code,
        meta: err.meta,
      });
    case "P2003":
    case "P2014":
      return new ConflictError("Relation constraint violation", err.code, {
        prismaCode: err.code,
        meta: err.meta,
      });
    case "P2025":
      return new NotFoundError("Resource not found", err.code, {
        prismaCode: err.code,
        meta: err.meta,
      });
    default:
      return null;
  }
}

function sanitizeJson(v: unknown): JsonValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return v;
  if (Array.isArray(v)) return v.map(sanitizeJson) as JsonValue;
  if (typeof v === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>))
      out[k] = sanitizeJson(val);
    return out;
  }
  return String(v);
}
