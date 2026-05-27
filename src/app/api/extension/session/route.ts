import { auth } from "@/auth";
import {
  buildExtensionCorsHeaders,
  isAllowedClipWriteOrigin,
} from "@/server/http/cors";
import { json } from "@/server/http/json";

function forbidden(req: Request) {
  return json(
    { message: "OriginNotAllowed", code: "FORBIDDEN" },
    { status: 403, headers: buildExtensionCorsHeaders(req) },
  );
}

export async function GET(req: Request) {
  if (!isAllowedClipWriteOrigin(req)) return forbidden(req);

  const session = await auth();
  return json(
    { loggedIn: Boolean(session?.user?.id) },
    { headers: buildExtensionCorsHeaders(req) },
  );
}

export function OPTIONS(req: Request) {
  if (!isAllowedClipWriteOrigin(req)) {
    return new Response(null, {
      status: 403,
      headers: buildExtensionCorsHeaders(req),
    });
  }

  return new Response(null, {
    status: 200,
    headers: buildExtensionCorsHeaders(req),
  });
}
