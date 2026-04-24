import { prisma } from "@/lib/prisma";
import {
  extForMime,
  PROFILE_AVATAR_MAX_BYTES,
  saveProfileAvatarFile,
  type AvatarSlot,
} from "@/lib/server/profileAvatarUpload";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
  }

  const existing = await prisma.profile.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const slotRaw = String(form.get("slot") ?? "");
  const slot: AvatarSlot = slotRaw === "personal" ? "personal" : "team";
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large", maxBytes: PROFILE_AVATAR_MAX_BYTES }, { status: 400 });
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
  const ext = extForMime(mime);
  if (!ext) {
    return NextResponse.json({ error: "unsupported_type", mime }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const url = await saveProfileAvatarFile(userId, slot, buf, ext);

  const data =
    slot === "team"
      ? { avatarUrl: url }
      : { personalAvatarUrl: url };

  await prisma.profile.update({
    where: { id: userId },
    data,
  });

  return NextResponse.json({
    ok: true,
    slot,
    url,
    avatarUrl: slot === "team" ? url : undefined,
    personalAvatarUrl: slot === "personal" ? url : undefined,
  });
}
