import { auth } from "@/auth";
import {
  buildClipWriteCorsHeaders,
  isAllowedClipWriteOrigin,
} from "@/server/http/cors";
import { toErrorPayload } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validation";
import { legacyClipCreateBodySchema } from "@/server/schemas/legacy-clips.schema";
import { createLegacyClip } from "@/server/services/legacy-clips";

/**
 * Session-bound legacy ingest endpoint.
 * This remains for old clients until /api/extension/* replaces it.
 */
export async function POST(req) {
  const headers = buildClipWriteCorsHeaders(req);

  if (!isAllowedClipWriteOrigin(req)) {
    return new Response(
      JSON.stringify({ message: "OriginNotAllowed", code: "FORBIDDEN" }),
      {
        status: 403,
        headers,
      },
    );
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          message: "Authentication required",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers,
        },
      );
    }

    const body = await parseJsonBody(req, legacyClipCreateBodySchema);
    const userId = Number.parseInt(session.user.id, 10);
    if (!Number.isSafeInteger(userId)) {
      return new Response(
        JSON.stringify({
          message: "Invalid session user id",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers,
        },
      );
    }

    const result = await createLegacyClip(userId, body);

    return new Response(JSON.stringify({ message: "保存完了", result }), {
      status: 201,
      headers,
    });
  } catch (error) {
    const { status, body } = toErrorPayload(error, {
      exposeDetails: process.env.NODE_ENV !== "production",
    });

    console.error("POST /api/receive error", error);

    return new Response(JSON.stringify(body), {
      status,
      headers,
    });
  }
}

/**
 * OPTIONS /api/receive
 */
export function OPTIONS(req) {
  const headers = buildClipWriteCorsHeaders(req);
  if (!isAllowedClipWriteOrigin(req)) {
    return new Response(null, {
      status: 403,
      headers,
    });
  }

  return new Response(null, {
    status: 200,
    headers,
  });
}
