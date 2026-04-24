import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      displayName: true,
      avatarUrl: true,
      personalAvatarUrl: true,
      phone: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    userId,
    displayName: profile.displayName,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    personalAvatarUrl: profile.personalAvatarUrl,
  });
}
