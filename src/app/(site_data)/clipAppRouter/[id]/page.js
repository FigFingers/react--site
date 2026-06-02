import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClipPage({ params }) {
  const { id } = await params;

  if (!id) return <h1>Missing ID</h1>;

  const clip = await prisma.clip.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: { vod: true },
  });

  if (!clip) return <h1>Not Found</h1>;

  const startSeconds = Math.floor(clip.startMs / 1000);
  const url =
    clip.vod.code === "Netflix"
      ? `https://www.netflix.com${clip.url}?t=${startSeconds}`
      : clip.url;

  redirect(url);
}
