import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const PROFILE_AVATAR_MAX_BYTES = 2.5 * 1024 * 1024;

export type AvatarSlot = "team" | "personal";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function extForMime(mime: string): string | null {
  return ALLOWED.get(mime.toLowerCase()) ?? null;
}

export function publicRelativePath(userId: string, slot: AvatarSlot, ext: string): string {
  const folder = slot === "team" ? "team" : "personal";
  return `/uploads/profile-avatars/${userId}/${folder}.${ext}`;
}

export async function saveProfileAvatarFile(
  userId: string,
  slot: AvatarSlot,
  bytes: Buffer,
  ext: string,
): Promise<string> {
  const rel = publicRelativePath(userId, slot, ext);
  const abs = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
  return rel;
}
