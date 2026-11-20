import { auth } from "@/auth";
import { assertSameOriginWrite } from "@/server/http/csrf";
import { toErrorPayload, UnauthorizedError } from "@/server/http/errors";
import { json } from "@/server/http/json";
import { parseJsonBody } from "@/server/http/validation";
import { extensionUnlinkBodySchema } from "@/server/schemas/extension.schema";
import { revokeLinkedExtension } from "@/server/services/extensions";

// Only the site's own account page unlinks an extension
// (src/lib/extension/client.ts). Like link-token, this cookie-authenticated
// write takes the v1 same-origin check instead of the extension allow-list.
export async function POST(req: Request) {
  try {
    assertSameOriginWrite(req);

    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const userId = Number.parseInt(session.user.id, 10);
    if (!Number.isSafeInteger(userId)) {
      throw new UnauthorizedError("Invalid session user id");
    }

    const body = await parseJsonBody(req as never, extensionUnlinkBodySchema);
    const result = await revokeLinkedExtension(userId, body.linkedExtensionId);

    return json({ ok: true, extensionInstanceId: result.extensionInstanceId });
  } catch (error) {
    const { status, body } = toErrorPayload(error, {
      exposeDetails: process.env.NODE_ENV !== "production",
    });
    return json(body, { status });
  }
}
