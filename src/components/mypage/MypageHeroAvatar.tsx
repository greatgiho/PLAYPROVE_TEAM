"use client";

import { RosterFace } from "@/components/roster/RosterFace";

type Props = {
  name: string;
  mainPhotoUrl: string | null;
  personalPhotoUrl?: string | null;
  showPersonalBadge?: boolean;
  size?: number;
  onEditPhoto?: () => void;
};

export function MypageHeroAvatar({
  name,
  mainPhotoUrl,
  personalPhotoUrl = null,
  showPersonalBadge = false,
  size = 88,
  onEditPhoto,
}: Props) {
  return (
    <div className="mypage-avatar" style={{ padding: 0, overflow: "visible", background: "transparent" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <RosterFace name={name} photoUrl={mainPhotoUrl} size={size} />
        {showPersonalBadge && personalPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={personalPhotoUrl}
            alt=""
            width={40}
            height={40}
            style={{
              position: "absolute",
              right: -4,
              bottom: -4,
              width: 40,
              height: 40,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          />
        ) : null}
        {onEditPhoto ? (
          <button
            type="button"
            className="mypage-hero-photo-btn"
            aria-label="프로필 사진 수정"
            onClick={onEditPhoto}
          >
            <i className="fas fa-camera" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
