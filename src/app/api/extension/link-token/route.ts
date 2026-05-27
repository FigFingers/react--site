import { auth } from "@/auth";
import {
  buildExtensionCorsHeaders,
  isAllowedClipWriteOrigin,
} from "@/server/http/cors";
import { json } from "@/server/http/json";
import { issueExtensionLinkToken } from "@/server/services/extensions";

function forbidden(req: Request) {
  return json(
    { message: "OriginNotAllowed", code: "FORBIDDEN" },
    {
      status: 403,
      headers: buildExtensionCorsHeaders(req, { methods: ["POST", "OPTIONS"] }),
    },
  );
}

export async function POST(req: Request) {
  const headers = buildExtensionCorsHeaders(req, {
    methods: ["POST", "OPTIONS"],
  });
  if (!isAllowedClipWriteOrigin(req)) return forbidden(req);

  const session = await auth();
  if (!session?.user?.id) {
    return json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401, headers },
    );
  }

  const userId = Number.parseInt(session.user.id, 10);
  if (!Number.isSafeInteger(userId)) {
    return json(
      { message: "Invalid session user id", code: "UNAUTHORIZED" },
      { status: 401, headers },
    );
  }

  const result = await issueExtensionLinkToken(userId);
  return json(
    {
      linkToken: result.linkToken,
      expiresAt: result.expiresAt,
    },
    { headers },
  );
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
