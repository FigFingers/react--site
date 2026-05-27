import {
  buildExtensionCorsHeaders,
  isAllowedClipWriteOrigin,
} from "@/server/http/cors";
import { toErrorPayload } from "@/server/http/errors";
import { json } from "@/server/http/json";
import { parseJsonBody } from "@/server/http/validation";
import { extensionSyncBodySchema } from "@/server/schemas/extension.schema";
import {
  parseBearerToken,
  syncExtensionItems,
} from "@/server/services/extensions";

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

  const extensionAuthToken = parseBearerToken(req.headers.get("authorization"));
  if (!extensionAuthToken) {
    return json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401, headers },
    );
  }

  try {
    const body = await parseJsonBody(req as never, extensionSyncBodySchema);
    const result = await syncExtensionItems(
      body.extensionInstanceId,
      extensionAuthToken,
      body,
    );

    return json(
      { ok: true, acceptedItemIds: result.acceptedItemIds },
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
