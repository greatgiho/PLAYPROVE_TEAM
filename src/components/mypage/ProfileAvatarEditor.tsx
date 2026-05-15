"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { useCallback, useEffect, useState } from "react";
import type { ProfileAvatarPayload } from "./profileAvatarTypes";

type Props = {
  userId: string;
  initial: ProfileAvatarPayload;
  onUpdated?: (next: ProfileAvatarPayload) => void;
  variant?: "card" | "plain";
};

function AvatarSlotPreview({
  label,
  url,
  busy,
  onPick,
}: {
  label: string;
  url: string | null;
  busy: boolean;
  onPick: (file: File | null) => void;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: "var(--gray-700)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            width={72}
            height={72}
            style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", border: "1px solid var(--gray-200)" }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              background: "var(--gray-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gray-400)",
              fontSize: 12,
            }}
          >
            없음
          </div>
        )}
        <span style={{ flex: 1 }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            style={{ fontSize: 12, maxWidth: "100%" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              onPick(f ?? null);
            }}
          />
        </span>
      </div>
    </label>
  );
}

export function ProfileAvatarEditor({ userId, initial, onUpdated, variant = "plain" }: Props) {
  const [data, setData] = useState<ProfileAvatarPayload>(initial);
  const [busy, setBusy] = useState<"team" | "personal" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setData(initial);
  }, [initial.avatarUrl, initial.personalAvatarUrl]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/profile/${userId}`, { cache: "no-store", credentials: "include" });
    const j = (await res.json().catch(() => null)) as ProfileAvatarPayload | ApiErrorBody | null;
    if (!res.ok) {
      setMsg(apiErrorUserHint(res.status, j as ApiErrorBody));
      return;
    }
    const ok = j as ProfileAvatarPayload;
    setData(ok);
    onUpdated?.(ok);
  }, [userId, onUpdated]);

  const upload = async (slot: "team" | "personal", file: File | null) => {
    if (!file) return;
    setMsg(null);
    setBusy(slot);
    try {
      const fd = new FormData();
      fd.set("slot", slot === "team" ? "team" : "personal");
      fd.set("file", file);
      const res = await fetch(`/api/profile/${userId}/avatar`, { method: "POST", body: fd, credentials: "include" });
      const j = (await res.json().catch(() => null)) as ApiErrorBody | null;
      if (!res.ok) {
        setMsg(apiErrorUserHint(res.status, j));
        return;
      }
      await refresh();
      setMsg(slot === "team" ? "선수/팀 대표 사진을 저장했습니다." : "개인 프로필 사진을 저장했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const body = (
    <>
      <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.55, marginBottom: 14 }}>
        <strong>선수/팀 대표</strong>는 로스터·팀 공식 노출에 쓰입니다. <strong>개인 프로필</strong>은 마이페이지 등 개인
        영역에 쓰입니다. 로스터에는 대표 사진이 우선 표시됩니다.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <AvatarSlotPreview
          label="선수 / 팀 대표"
          url={data.avatarUrl}
          busy={busy !== null}
          onPick={(f) => void upload("team", f)}
        />
        <AvatarSlotPreview
          label="개인 프로필"
          url={data.personalAvatarUrl}
          busy={busy !== null}
          onPick={(f) => void upload("personal", f)}
        />
      </div>
      <p style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 10, marginBottom: 0 }}>
        JPG / PNG / WebP, 파일당 최대 2.5MB. (로컬 서버는 <code>public/uploads/</code> 에 저장됩니다.)
      </p>
      {msg ? (
        <p
          style={{
            fontSize: 12,
            marginTop: 10,
            marginBottom: 0,
            color: msg.includes("실패") || msg.includes("오류") ? "var(--red)" : "var(--green)",
          }}
        >
          {msg}
        </p>
      ) : null}
    </>
  );

  if (variant === "card") {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: "18px 20px" }}>
          <div style={{ fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fas fa-camera" style={{ color: "var(--primary)" }} />
            프로필 사진 (최대 2장)
          </div>
          {body}
        </div>
      </div>
    );
  }

  return body;
}
