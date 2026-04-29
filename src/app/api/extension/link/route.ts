import {
  buildExtensionCorsHeaders,
  isAllowedClipWriteOrigin,
} from "@/server/http/cors";
import { toErrorPayload } from "@/server/http/errors";
import { json } from "@/server/http/json";
import { parseJsonBody } from "@/server/http/validation";
import { extensionLinkBodySchema } from "@/server/schemas/extension.schema";
import { consumeLinkTokenAndLinkExtension } from "@/server/services/extensions";

export async function POST(req: Request) {
  const headers = buildExtensionCorsHeaders(req, {
    methods: ["POST", "OPTIONS"],
  });
  if (!isAllowedClipWriteOrigin(req)) {
    return json(
      { message: "OriginNotAllowed", code: "FORBIDDEN" },
      { status: 403, headers },
    );
  }

  try {
    const body = await parseJsonBody(req as never, extensionLinkBodySchema);
    const result = await consumeLinkTokenAndLinkExtension(body);
    return json(
      { ok: true, extensionAuthToken: result.extensionAuthToken },
      { headers },
    );
  } catch (error) {
    const { status, body } = toErrorPayload(error, {
      exposeDetails: process.env.NODE_ENV !== "production",
    });
    return json(body, { status, headers });
  }
}

export function OPTIONS(req: Request) {
  if (!isAllowedClipWriteOrigin(req)) {
    return new Response(null, {
      status: 403,
      headers: buildExtensionCorsHeaders(req, { methods: ["POST", "OPTIONS"] }),
    });
  }

  return new Response(null, {
    status: 200,
    headers: buildExtensionCorsHeaders(req, { methods: ["POST", "OPTIONS"] }),
  });
}
