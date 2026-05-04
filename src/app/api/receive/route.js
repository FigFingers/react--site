import { buildClipWriteCorsHeaders, isAllowedClipWriteOrigin } from "@/lib/api/cors";
import { normalizeClipBatchPayload } from "@/lib/clips/contract";
import {
  resolveClipWriteOwnerFromLinkedExtension,
  writeClipBatch,
} from "@/lib/clips/service";
import { prisma } from "@/lib/prisma";
import { resolveLinkedExtension } from "@/lib/extension/service";

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}


async function handleClipWrite(req) {
  const headers = buildClipWriteCorsHeaders(req);
  if (!isAllowedClipWriteOrigin(req)) {
    return json({ message: "OriginNotAllowed" }, 403, headers);
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return json({ message: "InvalidJson", error: String(error) }, 400, headers);
  }

  const linkedExtensionResult = await resolveLinkedExtension(
    typeof body === "object" && body !== null ? body.extensionInstanceId : undefined
  );
  if (!linkedExtensionResult.ok) {
    const body400 = linkedExtensionResult.issues
      ? { message: "ValidationFailed", issues: linkedExtensionResult.issues }
      : { message: linkedExtensionResult.message };
    return json(body400, linkedExtensionResult.status, headers);
  }

  const normalized = normalizeClipBatchPayload(body);
  if (!normalized.ok) {
    return json(
      { message: "ValidationFailed", issues: normalized.issues },
      400,
      headers
    );
  }

  if (normalized.clips.length === 0) {
    return json(
      { message: "Saved", savedCount: 0, items: [], result: null },
      200,
      headers
    );
  }

  const owner = resolveClipWriteOwnerFromLinkedExtension(
    linkedExtensionResult.linkedExtension
  );

  try {
    const items = await writeClipBatch(normalized.clips, owner);
    await prisma.linkedExtension.update({
      where: { id: linkedExtensionResult.linkedExtension.id },
      data: { lastUsedAt: new Date() },
    });

    return json(
      {
        message: "Saved",
        savedCount: items.length,
        items,
        result: items[0] ? items[0] : null,
      },
      200,
      headers
    );
  } catch (error) {
    console.error("POST /api/receive error:", error);
    return json({ message: "SaveFailed", error: String(error) }, 500, headers);
  }
}

export async function POST(req) {
  return handleClipWrite(req);
}

export function OPTIONS(req) {
  const headers = buildClipWriteCorsHeaders(req);
  if (!isAllowedClipWriteOrigin(req)) {
    return new Response(null, { status: 403, headers });
  }
  return new Response(null, { status: 200, headers });
}
