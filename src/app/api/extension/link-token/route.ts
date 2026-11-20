import { requireUserId } from "@/server/auth/session";
import { assertSameOriginWrite } from "@/server/http/csrf";
import { toErrorPayload } from "@/server/http/errors";
import { json } from "@/server/http/json";
import { issueExtensionLinkToken } from "@/server/services/extensions";

// Only the site's own account page asks for a link token
// (src/lib/extension/client.ts), and whoever holds one can exchange it at
// /api/extension/link for a 90-day extension token. The extension allow-list
// may admit every chrome-extension:// origin, so this cookie-authenticated
// write takes the same same-origin check as v1 writes and sends no CORS headers.
export async function POST(req: Request) {
  try {
    assertSameOriginWrite(req);
    const userId = await requireUserId();
    const result = await issueExtensionLinkToken(userId);
    return json(result);
  } catch (error) {
    const { status, body } = toErrorPayload(error);
    return json(body, { status });
  }
}
