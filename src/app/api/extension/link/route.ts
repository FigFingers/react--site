import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { buildExtensionCorsHeaders, isAllowedExtensionOrigin } from "@/lib/api/cors";
import { linkExtensionInstanceToUser, normalizeExtensionLinkPayload } from "@/lib/extension/service";
import { signExtensionToken } from "@/lib/extension/jwt";

function buildHeaders(req: NextRequest) {
  return buildExtensionCorsHeaders(req, { methods: ["POST", "OPTIONS"] });
}

function json(req: NextRequest, body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: buildHeaders(req) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return json(req, { message: "Unauthorized" }, 401);
  }
  if (!isAllowedExtensionOrigin(req)) {
    return json(req, { message: "OriginNotAllowed" }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return json(req, { message: "InvalidJson", error: String(error) }, 400);
  }

  const normalized = normalizeExtensionLinkPayload(body);
  if (!normalized.ok) {
    return json(req, { message: "ValidationFailed", issues: normalized.issues }, 400);
  }

  const result = await linkExtensionInstanceToUser({
    userId: session.user.id,
    extensionInstanceId: normalized.extensionInstanceId,
  });
  if (result.ok) {
    const token = await signExtensionToken({
      extensionInstanceId: result.extensionInstanceId,
      userId: result.userId,
    });
    return json(req, { ok: true, token }, 200);
  }
  return json(req, { message: result.message }, result.status);
}

export function OPTIONS(req: NextRequest) {
  const headers = buildHeaders(req);
  if (!isAllowedExtensionOrigin(req)) {
    return new Response(null, { status: 403, headers });
  }
  return new Response(null, { status: 200, headers });
}
