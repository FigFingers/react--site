import { ForbiddenError } from "@/server/http/errors";
import { requireSiteOrigin } from "@/server/http/site-origin";

/** Cookie-authenticated v1 writes are only intended for the site's own origin. */
export function assertSameOriginWrite(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (
    fetchSite === "cross-site" ||
    (origin === null && fetchSite !== null && fetchSite !== "same-origin") ||
    // Only a request with an Origin needs the configured site origin, so a
    // missing AUTH_URL / NEXTAUTH_URL surfaces here as a configuration error.
    (origin !== null && origin !== requireSiteOrigin())
  ) {
    throw new ForbiddenError(
      "Cross-origin write not allowed",
      "ORIGIN_NOT_ALLOWED",
    );
  }
  // Non-browser callers may omit both headers. JSON body parsing additionally
  // requires application/json, so a simple HTML form cannot take this path.
}
