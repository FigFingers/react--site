import type { LegacyClipCreateBody } from "@/server/schemas/legacy-clips.schema";
import { createClip } from "@/server/services/clips";
import { resolveVodIdByLookup } from "@/server/services/vods";

type LegacyClipCreateData = {
  vodId: number;
  name: string;
  title: string;
  startMs: number;
  endMs: number;
  url: string;
  epnum: string | null;
};

export async function createLegacyClip(
  userId: number,
  body: LegacyClipCreateBody,
) {
  return createClip(userId, await buildLegacyClipCreateData(body));
}

export async function buildLegacyClipCreateData(
  body: LegacyClipCreateBody,
): Promise<LegacyClipCreateData> {
  const vodId = await resolveVodIdByLookup(body.service);

  return {
    vodId,
    name: body.clipName?.trim() || "切り抜き",
    title: body.title.trim(),
    startMs: secondsToMs(body.StartTime),
    endMs: secondsToMs(body.EndTime),
    url: body.URL.trim(),
    epnum: body.epnumber?.trim() || null,
  };
}

function secondsToMs(value: number) {
  return Math.round(value * 1000);
}
