export type CanonicalClipInput = {
  startTime: number;
  endTime: number;
  url: string;
  service: string;
  title: string;
  epnumber?: string | null;
  clipName?: string | null;
};

export type ClipPayloadIssue = {
  index: number;
  field: string;
  message: string;
};

export type NormalizedClipBatchResult =
  | { ok: true; clips: CanonicalClipInput[] }
  | { ok: false; issues: ClipPayloadIssue[] };

type RawClipPayload = Record<string, unknown>;

function isRecord(value: unknown): value is RawClipPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickFirst(payload: RawClipPayload, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      return payload[key];
    }
  }

  return undefined;
}

function normalizeRequiredString(
  value: unknown,
  field: string,
  index: number,
  issues: ClipPayloadIssue[]
) {
  const text = typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

  if (!text) {
    issues.push({
      index,
      field,
      message: `${field} is required`,
    });
    return null;
  }

  return text;
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function normalizeRequiredNumber(
  value: unknown,
  field: string,
  index: number,
  issues: ClipPayloadIssue[]
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed)) {
    issues.push({
      index,
      field,
      message: `${field} must be a finite number`,
    });
    return null;
  }

  return parsed;
}

function normalizeSingleClip(
  rawClip: unknown,
  index: number,
  issues: ClipPayloadIssue[]
) {
  if (!isRecord(rawClip)) {
    issues.push({
      index,
      field: "body",
      message: "each clip must be an object",
    });
    return null;
  }

  const startTime = normalizeRequiredNumber(
    pickFirst(rawClip, ["startTime", "StartTime"]),
    "startTime",
    index,
    issues
  );
  const endTime = normalizeRequiredNumber(
    pickFirst(rawClip, ["endTime", "EndTime"]),
    "endTime",
    index,
    issues
  );
  const url = normalizeRequiredString(
    pickFirst(rawClip, ["url", "URL"]),
    "url",
    index,
    issues
  );
  const service = normalizeRequiredString(
    pickFirst(rawClip, ["service", "platform"]),
    "service",
    index,
    issues
  );
  const title = normalizeRequiredString(
    pickFirst(rawClip, ["title", "Title"]),
    "title",
    index,
    issues
  );

  const clipName = normalizeOptionalString(
    pickFirst(rawClip, ["clipName", "clipname"])
  );
  const epnumber = normalizeOptionalString(
    pickFirst(rawClip, ["epnumber", "epNumber", "Subtitles", "subtitles"])
  );

  if (
    typeof startTime === "number" &&
    typeof endTime === "number" &&
    endTime < startTime
  ) {
    issues.push({
      index,
      field: "endTime",
      message: "endTime must be greater than or equal to startTime",
    });
  }

  if (
    startTime === null ||
    endTime === null ||
    url === null ||
    service === null ||
    title === null
  ) {
    return null;
  }

  return {
    startTime,
    endTime,
    url,
    service,
    title,
    epnumber,
    clipName,
  } satisfies CanonicalClipInput;
}

function extractRawClipList(body: unknown) {
  if (Array.isArray(body)) {
    return body;
  }

  if (!isRecord(body)) {
    return null;
  }

  const candidates = ["clips", "items", "queue"] as const;
  for (const key of candidates) {
    const value = body[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [body];
}

export function normalizeClipBatchPayload(body: unknown): NormalizedClipBatchResult {
  const rawClips = extractRawClipList(body);

  if (rawClips === null) {
    return {
      ok: false,
      issues: [
        {
          index: -1,
          field: "body",
          message: "body must be a clip object, an array, or an object with clips[]",
        },
      ],
    };
  }

  const issues: ClipPayloadIssue[] = [];
  const clips = rawClips
    .map((rawClip, index) => normalizeSingleClip(rawClip, index, issues))
    .filter((clip): clip is CanonicalClipInput => clip !== null);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, clips };
}
