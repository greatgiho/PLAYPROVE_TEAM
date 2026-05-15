"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import type { VideoFeedbackDto } from "@/lib/video/types";
import { useCallback, useEffect, useState } from "react";

type RosterLite = { id: string; fullName: string };

export function VideoFeedbackForm({
  teamCode,
  archiveId,
  rosterPlayers,
  coachWriteEnabled,
  timestampSeconds,
  timestampNonce,
  onSubmitted,
}: {
  teamCode: string;
  archiveId: string;
  rosterPlayers: RosterLite[];
  coachWriteEnabled: boolean;
  /** `VideoPlayerContainer` 캡처 시 초; `timestampNonce` 가 바뀌면 같은 초도 다시 반영 */
  timestampSeconds: number;
  timestampNonce: number;
  onSubmitted?: (row: VideoFeedbackDto) => void;
}) {
  const [ts, setTs] = useState(String(timestampSeconds));
  const [content, setContent] = useState("");
  const [taggedId, setTaggedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setTs(String(timestampSeconds));
  }, [timestampSeconds, timestampNonce]);

  const submit = useCallback(async () => {
    if (!coachWriteEnabled) return;
    const t = Number.parseInt(ts, 10);
    if (Number.isNaN(t) || t < 0) {
      setErr("타임스탬프(초)는 0 이상 정수여야 합니다.");
      return;
    }
    const body = {
      timestampSeconds: t,
      content: content.trim(),
      taggedPlayerId: taggedId || null,
    };
    if (!body.content) {
      setErr("피드백 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/team/video-archives/${encodeURIComponent(archiveId)}/feedback?teamCode=${encodeURIComponent(teamCode)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(apiErrorUserHint(res.status, raw as ApiErrorBody));
        return;
      }
      const row = (raw as { feedback?: VideoFeedbackDto }).feedback;
      if (row) onSubmitted?.(row);
      setContent("");
      setTaggedId("");
    } finally {
      setSaving(false);
    }
  }, [archiveId, coachWriteEnabled, content, onSubmitted, taggedId, teamCode, ts]);

  if (!coachWriteEnabled) {
    return <p className="text-sm text-neutral-500">코치·매니저만 피드백을 작성할 수 있습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-neutral-900">피드백 작성</div>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        시점(초)
        <input
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          inputMode="numeric"
          value={ts}
          onChange={(e) => setTs(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        언급 선수(선택)
        <select
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          value={taggedId}
          onChange={(e) => setTaggedId(e.target.value)}
        >
          <option value="">— 없음 —</option>
          {rosterPlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        내용
        <textarea
          className="min-h-[88px] rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="이 시점에서의 코멘트…"
        />
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="button"
        disabled={saving}
        className="rounded-md bg-[#5a1010] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4a0d0d] disabled:opacity-50"
        onClick={() => void submit()}
      >
        {saving ? "저장 중…" : "피드백 저장"}
      </button>
    </div>
  );
}

export function VideoFeedbackList({ items }: { items: VideoFeedbackDto[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">아직 피드백이 없습니다.</p>;
  }
  return (
    <ul className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
      {items.map((f) => (
        <li
          key={f.id}
          className="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2 text-sm text-neutral-800"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-xs font-semibold text-[#5a1010]">{f.timestampSeconds}s</span>
            <span className="text-xs text-neutral-500">
              {f.authorDisplayName?.trim() || "이름 없음"}
              {f.taggedPlayerName ? ` → ${f.taggedPlayerName}` : ""}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-neutral-900">{f.content}</p>
        </li>
      ))}
    </ul>
  );
}
