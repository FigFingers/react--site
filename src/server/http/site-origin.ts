// The site's public origin, for checks that compare it with a request's Origin.
//
// Behind a reverse proxy request.url is Next's internal URL (for example
// http://localhost:3000), so the origin comes from configuration only:
// AUTH_URL first, then NEXTAUTH_URL. A blank value counts as unset, so an
// `AUTH_URL=` line left in an env file falls through to NEXTAUTH_URL instead
// of failing to parse.
//
// Auth.js reads the same variables but stops at a blank AUTH_URL and derives
// its own URL from the request host (trustHost). src/auth.ts follows Auth.js.
const SITE_URL_VARIABLES = ["AUTH_URL", "NEXTAUTH_URL"] as const;

/** The configured site origin, or undefined when neither variable is set. */
export function configuredSiteOrigin(): string | undefined {
  for (const name of SITE_URL_VARIABLES) {
    const value = process.env[name]?.trim();
    if (!value) continue;

    const url = URL.canParse(value) ? new URL(value) : null;
    // "localhost:3000" parses with the scheme "localhost:" and an opaque
    // origin, which serializes as "null" and would match sandboxed pages.
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
      throw new Error(`${name} must be an absolute http(s) URL`);
    }
    return url.origin;
  }
  return undefined;
}

/**
 * The configured site origin. Missing configuration is an operator error, so
 * it throws instead of letting the caller treat the site's own pages as
 * cross-origin.
 */
export function requireSiteOrigin(): string {
  const origin = configuredSiteOrigin();
  if (!origin) {
    throw new Error("Set AUTH_URL or NEXTAUTH_URL to the site's public URL");
  }
  return origin;
}
