const allowedOriginsEnv = process.env.CLIP_API_ALLOWED_ORIGINS ?? "";
const CLIP_WRITE_ALLOWED_ORIGINS = [process.env.NEXTAUTH_URL, ...allowedOriginsEnv.split(",")];
const CLIP_WRITE_ALLOWED_ORIGINS_NORMALIZED = CLIP_WRITE_ALLOWED_ORIGINS
  .map((v) => v?.trim())
  .filter(Boolean) as string[];

const DEFAULT_ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-Extension-Instance-Id"];
const CHROME_EXTENSION_ORIGIN_PREFIX = "chrome-extension://";

type CorsOptions = {
  methods?: string[];
  allowHeaders?: string[];
  isAllowed?: (request: Request) => boolean;
};

function buildCorsHeaders(request: Request, options?: CorsOptions): Record<string, string> {
  const methods = options?.methods ?? ["POST", "OPTIONS"];
  const allowHeaders = options?.allowHeaders ?? DEFAULT_ALLOWED_HEADERS;
  const isAllowed = options?.isAllowed ?? isAllowedClipWriteOrigin;
  const origin = request.headers.get("origin");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": allowHeaders.join(", "),
    Vary: "Origin",
  };

  if (origin && isAllowed(request)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function isAllowedClipWriteOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestOrigin = new URL(request.url).origin;
    if (origin === requestOrigin) return true;
  } catch {
    // ignore malformed URLs
  }

  return CLIP_WRITE_ALLOWED_ORIGINS_NORMALIZED.includes(origin);
}

// /api/extension/* 用: chrome-extension://<id> origin も許可する。
// これらのエンドポイントは Bearer JWT で個別に認証されるため、
// Origin チェックは defense-in-depth に留めて拡張機能のサービスワーカーから
// 直接呼び出せるようにする。
export function isAllowedExtensionOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (typeof origin === "string" && origin.startsWith(CHROME_EXTENSION_ORIGIN_PREFIX)) {
    return true;
  }
  return isAllowedClipWriteOrigin(request);
}

export function buildClipWriteCorsHeaders(request: Request, options?: CorsOptions) {
  return buildCorsHeaders(request, options);
}

export function buildExtensionCorsHeaders(request: Request, options?: CorsOptions) {
  const methods = options?.methods ?? ["GET", "POST", "OPTIONS"];
  return buildCorsHeaders(request, { methods, allowHeaders: DEFAULT_ALLOWED_HEADERS, isAllowed: isAllowedExtensionOrigin });
}
