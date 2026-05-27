const allowedOriginsEnv = process.env.CLIP_API_ALLOWED_ORIGINS ?? "";

function normalizeOrigins(values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean) as string[];
}

const clipWriteAllowedOrigins = normalizeOrigins([
  process.env.AUTH_URL,
  process.env.NEXTAUTH_URL,
  ...allowedOriginsEnv.split(","),
]);

type CorsOptions = {
  methods?: string[];
  allowHeaders?: string[];
};

export function isAllowedClipWriteOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return clipWriteAllowedOrigins.includes(origin);
}

export function buildClipWriteCorsHeaders(
  request: Request,
  options: CorsOptions = {},
) {
  const origin = request.headers.get("origin");
  const methods = options.methods ?? ["POST", "OPTIONS"];
  const allowHeaders = options.allowHeaders ?? ["Content-Type"];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": allowHeaders.join(", "),
    Vary: "Origin",
  };

  if (origin && isAllowedClipWriteOrigin(request)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function buildExtensionCorsHeaders(
  request: Request,
  options: CorsOptions = {},
) {
  return buildClipWriteCorsHeaders(request, {
    methods: options.methods ?? ["GET", "POST", "OPTIONS"],
    allowHeaders: options.allowHeaders ?? ["Content-Type", "Authorization"],
  });
}
