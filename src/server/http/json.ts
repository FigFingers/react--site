export function json(data: unknown, init?: ResponseInit) {
  return Response.json(toJsonSafe(data), init);
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonSafe);

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = toJsonSafe(item);
    }
    return result;
  }

  return value;
}
