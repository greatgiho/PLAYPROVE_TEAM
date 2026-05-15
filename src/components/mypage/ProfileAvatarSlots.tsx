"use client";

import { ProfileAvatarEditor } from "./ProfileAvatarEditor";
import type { ProfileAvatarPayload } from "./profileAvatarTypes";

export type { ProfileAvatarPayload } from "./profileAvatarTypes";

type Props = {
  userId: string;
  initial: ProfileAvatarPayload;
  onUpdated?: (next: ProfileAvatarPayload) => void;
};

/** @deprecated 페이지 상단 인라인 카드 — `ProfileAvatarModal` + 히어로 버튼 사용 권장 */
export function ProfileAvatarSlots({ userId, initial, onUpdated }: Props) {
  return <ProfileAvatarEditor userId={userId} initial={initial} onUpdated={onUpdated} variant="card" />;
}
