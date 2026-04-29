import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_NICKNAME_LENGTH = 30;

function normalizeNickname(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const nickname = value.trim().replace(/\s+/g, " ");
  return nickname.length > 0 ? nickname : null;
}

function validateNickname(nickname: string | null) {
  if (nickname === null) {
    return null;
  }

  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return "Nickname must be 30 characters or less.";
  }

  if (/[\u0000-\u001f\u007f]/.test(nickname)) {
    return "Nickname contains invalid characters.";
  }

  return null;
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Object.prototype.hasOwnProperty.call(body, "nickname")
  ) {
    return NextResponse.json({ error: "Nickname is required." }, { status: 400 });
  }

  const nickname = normalizeNickname((body as Record<string, unknown>).nickname);
  const validationError = validateNickname(nickname);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        nickname,
        nicknameNorm: nickname ? nickname.toLocaleLowerCase("ja-JP") : null,
      },
      select: {
        nickname: true,
      },
    });

    return NextResponse.json({ nickname: user.nickname });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Nickname is already in use." },
        { status: 409 },
      );
    }

    console.error("nickname update error:", error);
    return NextResponse.json(
      { error: "Failed to update nickname" },
      { status: 500 },
    );
  }
}
