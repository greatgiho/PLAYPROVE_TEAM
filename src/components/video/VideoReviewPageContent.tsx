"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { MediaPlaybackProvider } from "@/lib/video/MediaPlaybackContext";
import type {
  VideoArchiveDto,
  VideoFeedbackDto,
  VideoPerformanceAggregateDto,
  VideoPerformanceScoreDto,
} from "@/lib/video/types";
import { canWriteCoachPlanRole } from "@/lib/team/coachPlanClient";
import { getPlayproveTeamCode, hasPlayproveTeamCode } from "@/lib/config";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VideoFeedbackForm } from "./VideoFeedbackForm";
import { VideoPlayerContainer } from "./VideoPlayerContainer";

const teamCode = getPlayproveTeamCode();

type RosterPlayerLite = { id: string; full_name: string };
type TabId = "feedback" | "communication" | "stats";
type ChatRow = { id: string; message: string; authorName: string; createdAt: string };
type ScoreDraft = {
  playerId: string;
  physical: string;
  skill: string;
  tactical: string;
  attendanceMetric: string;
  mental: string;
  coachComment: string;
};

const TAB_LIST: Array<{ id: TabId; label: string }> = [
  { id: "feedback", label: "피드백" },
  { id: "communication", label: "커뮤니케이션" },
  { id: "stats", label: "스탯" },
];

function isFinalizeRole(teamRole: string | undefined): boolean {
  return teamRole === "manager" || teamRole === "head_coach";
}

function readChatStorage(archiveId: string): ChatRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`pp_video_thread_${archiveId}`);
    if (!raw) return [];
    const v = JSON.parse(raw) as ChatRow[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeChatStorage(archiveId: string, rows: ChatRow[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`pp_video_thread_${archiveId}`, JSON.stringify(rows));
}

export function VideoReviewPageContent({
  teamRole,
  userId,
}: {
  teamRole: string | undefined;
  userId: string | undefined;
}) {
  const [archives, setArchives] = useState<VideoArchiveDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<VideoFeedbackDto[]>([]);
  const [rosterPlayers, setRosterPlayers] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [targetTimeRevision, setTargetTimeRevision] = useState(0);
  const [stamp, setStamp] = useState({ seconds: 0, nonce: 0 });
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newKind, setNewKind] = useState<"YOUTUBE" | "INTERNAL">("YOUTUBE");
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("feedback");
  const [chatRows, setChatRows] = useState<ChatRow[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [statsItems, setStatsItems] = useState<VideoPerformanceScoreDto[]>([]);
  const [statsAggByPlayer, setStatsAggByPlayer] = useState<VideoPerformanceAggregateDto[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({
    playerId: "",
    physical: "5",
    skill: "5",
    tactical: "5",
    attendanceMetric: "5",
    mental: "5",
    coachComment: "",
  });

  const coachWrite = canWriteCoachPlanRole(teamRole);
  const finalizer = isFinalizeRole(teamRole);
  const hasCode = hasPlayproveTeamCode();

  const selected = useMemo(() => archives.find((a) => a.id === selectedId) ?? null, [archives, selectedId]);
  const selectedAgg = useMemo(
    () => statsAggByPlayer.find((v) => v.playerId === selectedPlayerId) ?? null,
    [selectedPlayerId, statsAggByPlayer],
  );
  const selectedPlayerName = useMemo(
    () => rosterPlayers.find((p) => p.id === selectedPlayerId)?.fullName ?? null,
    [rosterPlayers, selectedPlayerId],
  );

  const loadArchives = useCallback(async () => {
    if (!teamCode) return;
    const res = await fetch(`/api/team/video-archives?teamCode=${encodeURIComponent(teamCode)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(apiErrorUserHint(res.status, raw as ApiErrorBody));
    const list = (raw as { archives?: VideoArchiveDto[] }).archives ?? [];
    setArchives(list);
    setSelectedId((prev) => {
      if (prev && list.some((a) => a.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!teamCode) return;
    const res = await fetch(`/api/team/video-archives/${encodeURIComponent(id)}?teamCode=${encodeURIComponent(teamCode)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(apiErrorUserHint(res.status, raw as ApiErrorBody));
    setFeedbacks((raw as { feedbacks?: VideoFeedbackDto[] }).feedbacks ?? []);
  }, []);

  const loadStats = useCallback(
    async (archiveId: string) => {
      if (!teamCode) return;
      setStatsLoading(true);
      setStatsErr(null);
      try {
        const q = selectedPlayerId ? `&playerId=${encodeURIComponent(selectedPlayerId)}` : "";
        const res = await fetch(
          `/api/team/video-archives/${encodeURIComponent(archiveId)}/stats?teamCode=${encodeURIComponent(teamCode)}${q}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );
        const raw = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiErrorUserHint(res.status, raw as ApiErrorBody));
        const body = raw as {
          items?: VideoPerformanceScoreDto[];
          aggregateByPlayer?: VideoPerformanceAggregateDto[];
        };
        setStatsItems(body.items ?? []);
        setStatsAggByPlayer(body.aggregateByPlayer ?? []);
      } catch (e) {
        setStatsErr(e instanceof Error ? e.message : "스탯 로드 실패");
      } finally {
        setStatsLoading(false);
      }
    },
    [selectedPlayerId],
  );

  useEffect(() => {
    if (!hasCode) {
      setLoading(false);
      setErr("NEXT_PUBLIC_PLAYPROVE_TEAM_CODE 가 필요합니다.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [rRes] = await Promise.all([
          fetch(`/api/roster?teamCode=${encodeURIComponent(teamCode!)}`, { credentials: "include", cache: "no-store" }),
        ]);
        const rJson = await rRes.json().catch(() => ({}));
        if (!rRes.ok) throw new Error(apiErrorUserHint(rRes.status, rJson as ApiErrorBody));
        const players = ((rJson as { players?: RosterPlayerLite[] }).players ?? []).map((p) => ({
          id: p.id,
          fullName: p.full_name,
        }));
        if (!cancelled) setRosterPlayers(players);
        if (!cancelled && players.length > 0) {
          setSelectedPlayerId((prev) => prev || players[0]!.id);
          setScoreDraft((prev) => ({ ...prev, playerId: prev.playerId || players[0]!.id }));
        }
        await loadArchives();
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasCode, loadArchives]);

  useEffect(() => {
    if (!selectedId || !teamCode) return;
    let cancelled = false;
    (async () => {
      try {
        await loadDetail(selectedId);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "상세 로드 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedId || activeTab !== "communication") return;
    setChatRows(readChatStorage(selectedId));
  }, [selectedId, activeTab]);

  useEffect(() => {
    if (!selectedId || activeTab !== "stats") return;
    void loadStats(selectedId);
  }, [activeTab, selectedId, selectedPlayerId, loadStats]);

  const onCapture = useCallback((seconds: number) => {
    setStamp((s) => ({ seconds, nonce: s.nonce + 1 }));
  }, []);

  const onFeedbackSubmitted = useCallback((row: VideoFeedbackDto) => {
    setFeedbacks((prev) => [...prev, row].sort((a, b) => a.timestampSeconds - b.timestampSeconds || a.createdAt.localeCompare(b.createdAt)));
  }, []);

  const jumpToSeconds = useCallback((s: number) => {
    setTargetTime(s);
    setTargetTimeRevision((r) => r + 1);
  }, []);

  const createArchive = useCallback(async () => {
    if (!teamCode || !coachWrite) return;
    const title = newTitle.trim();
    const sourceUrl = newUrl.trim();
    if (!title || !sourceUrl) {
      setErr("제목과 URL 을 입력해 주세요.");
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/team/video-archives?teamCode=${encodeURIComponent(teamCode)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sourceUrl, sourceType: newKind }),
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorUserHint(res.status, raw as ApiErrorBody));
      const ar = (raw as { archive?: VideoArchiveDto }).archive;
      if (ar) {
        setArchives((prev) => [ar, ...prev]);
        setSelectedId(ar.id);
        setNewTitle("");
        setNewUrl("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setCreating(false);
    }
  }, [coachWrite, newKind, newTitle, newUrl]);

  const deleteFeedback = useCallback(
    async (feedbackId: string) => {
      if (!selected || !teamCode) return;
      const res = await fetch(
        `/api/team/video-archives/${encodeURIComponent(selected.id)}/feedback/${encodeURIComponent(feedbackId)}?teamCode=${encodeURIComponent(teamCode)}`,
        { method: "DELETE", credentials: "include" },
      );
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorUserHint(res.status, raw as ApiErrorBody));
      setFeedbacks((prev) => prev.filter((v) => v.id !== feedbackId));
    },
    [selected],
  );

  const submitChat = useCallback(() => {
    if (!selectedId || !chatInput.trim()) return;
    const next: ChatRow = {
      id: crypto.randomUUID(),
      message: chatInput.trim(),
      authorName: userId ? `${teamRole ?? "staff"} · ${userId.slice(0, 8)}` : teamRole ?? "staff",
      createdAt: new Date().toISOString(),
    };
    const rows = [next, ...chatRows].slice(0, 300);
    setChatRows(rows);
    writeChatStorage(selectedId, rows);
    setChatInput("");
  }, [chatInput, chatRows, selectedId, teamRole, userId]);

  const submitScore = useCallback(async () => {
    if (!selected || !teamCode || !coachWrite) return;
    const payload = {
      playerId: scoreDraft.playerId,
      physical: Number(scoreDraft.physical),
      skill: Number(scoreDraft.skill),
      tactical: Number(scoreDraft.tactical),
      attendanceMetric: Number(scoreDraft.attendanceMetric),
      mental: Number(scoreDraft.mental),
      coachComment: scoreDraft.coachComment.trim(),
    };
    const res = await fetch(
      `/api/team/video-archives/${encodeURIComponent(selected.id)}/stats?teamCode=${encodeURIComponent(teamCode)}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(apiErrorUserHint(res.status, raw as ApiErrorBody));
    setScoreDraft((prev) => ({ ...prev, coachComment: "" }));
    await loadStats(selected.id);
  }, [coachWrite, loadStats, scoreDraft, selected]);

  const approveScores = useCallback(async () => {
    if (!selected || !teamCode || !selectedPlayerId || !finalizer) return;
    const res = await fetch(
      `/api/team/video-archives/${encodeURIComponent(selected.id)}/stats/approve?teamCode=${encodeURIComponent(teamCode)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedPlayerId }),
      },
    );
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(apiErrorUserHint(res.status, raw as ApiErrorBody));
    await loadStats(selected.id);
  }, [finalizer, loadStats, selected, selectedPlayerId]);

  if (!hasCode) {
    return <p className="text-sm text-red-600">{err}</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">영상 리뷰</h1>
        <p className="mt-1 text-sm text-neutral-600">
          유튜브·내부 URL 재생을 한 컨트롤러로 묶었습니다. 타임라인에서 시각을 바꾸면 플레이어가 해당 초로 이동합니다.
        </p>
      </header>

      {loading && <p className="text-sm text-neutral-500">불러오는 중…</p>}
      {err && !loading && <p className="text-sm text-red-600">{err}</p>}

      {!loading && coachWrite && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">새 영상 등록</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-neutral-600">
              유형
              <select
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as "YOUTUBE" | "INTERNAL")}
              >
                <option value="YOUTUBE">YouTube</option>
                <option value="INTERNAL">내부 / HTML5 URL</option>
              </select>
            </label>
            <label className="flex min-w-[180px] flex-[2] flex-col gap-1 text-xs font-medium text-neutral-600">
              제목
              <input
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 1쿼터 쉘 영상"
              />
            </label>
            <label className="flex min-w-[220px] flex-[3] flex-col gap-1 text-xs font-medium text-neutral-600">
              URL
              <input
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="YouTube 링크 또는 .mp4 URL"
              />
            </label>
            <button
              type="button"
              disabled={creating}
              className="rounded-md bg-[#5a1010] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a0d0d] disabled:opacity-50"
              onClick={() => void createArchive()}
            >
              {creating ? "등록 중…" : "등록"}
            </button>
          </div>
        </section>
      )}

      {!loading && archives.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <aside className="w-full shrink-0 sm:max-w-[220px]">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">아카이브</div>
            <ul className="mt-2 flex max-h-[360px] flex-col gap-1 overflow-y-auto">
              {archives.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={[
                      "w-full rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                      a.id === selectedId
                        ? "border-[#5a1010] bg-[#5a1010]/10 font-semibold text-[#5a1010]"
                        : "border-neutral-200 bg-white hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    {a.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            {selected && (
              <MediaPlaybackProvider archive={selected}>
                <div className="space-y-4">
                  <div className="sticky top-0 z-20 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                    <VideoPlayerContainer
                      archive={selected}
                      targetTime={targetTime}
                      targetTimeRevision={targetTimeRevision}
                      coachCaptureEnabled={coachWrite}
                      onTimestampCaptured={onCapture}
                    />
                  </div>

                  <div className="h-[52vh] min-h-[360px] overflow-y-auto rounded-xl border border-neutral-200 bg-white">
                    <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 py-3">
                      <div className="flex gap-2">
                        {TAB_LIST.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            className={[
                              "rounded-md px-3 py-1.5 text-sm font-medium",
                              tab.id === activeTab
                                ? "bg-[#5a1010] text-white"
                                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                            ].join(" ")}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4">
                      {activeTab === "feedback" && (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 p-3">
                            <div className="text-xs font-semibold text-neutral-600">타임라인 점프</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {[0, 30, 60, 120].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50"
                                  onClick={() => jumpToSeconds(s)}
                                >
                                  {s}s 로 이동
                                </button>
                              ))}
                            </div>
                          </div>
                          <VideoFeedbackForm
                            teamCode={teamCode!}
                            archiveId={selected.id}
                            rosterPlayers={rosterPlayers}
                            coachWriteEnabled={coachWrite}
                            timestampSeconds={stamp.seconds}
                            timestampNonce={stamp.nonce}
                            onSubmitted={onFeedbackSubmitted}
                          />
                          <div className="space-y-2">
                            {feedbacks.map((f) => (
                              <div key={f.id} className="rounded-lg border border-neutral-200 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 overflow-hidden rounded-full bg-neutral-200">
                                      {f.authorAvatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={f.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                                      ) : null}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                      {f.authorDisplayName || "이름 없음"}
                                      {f.taggedPlayerName ? ` · ${f.taggedPlayerName}` : ""}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="rounded-md bg-neutral-100 px-2 py-1 text-xs hover:bg-neutral-200"
                                      onClick={() => jumpToSeconds(f.timestampSeconds)}
                                    >
                                      {f.timestampSeconds}s
                                    </button>
                                    {finalizer && (
                                      <button
                                        type="button"
                                        className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                                        onClick={() => void deleteFeedback(f.id).catch((e) => setErr((e as Error).message))}
                                      >
                                        삭제
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{f.content}</p>
                              </div>
                            ))}
                            {feedbacks.length === 0 && <p className="text-sm text-neutral-500">아직 피드백이 없습니다.</p>}
                          </div>
                        </div>
                      )}

                      {activeTab === "communication" && (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-neutral-200 p-3">
                            <div className="text-xs font-semibold text-neutral-600">자유 대화 스레드</div>
                            <div className="mt-2 flex gap-2">
                              <input
                                className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                                placeholder="코칭 메모·협의사항 입력"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                              />
                              <button
                                type="button"
                                className="rounded-md bg-[#5a1010] px-3 py-1.5 text-sm font-semibold text-white"
                                onClick={submitChat}
                              >
                                등록
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {chatRows.map((row) => (
                              <div key={row.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
                                <div className="text-xs text-neutral-500">{row.authorName}</div>
                                <p className="mt-1 whitespace-pre-wrap text-neutral-900">{row.message}</p>
                              </div>
                            ))}
                            {chatRows.length === 0 && <p className="text-sm text-neutral-500">대화가 없습니다.</p>}
                          </div>
                        </div>
                      )}

                      {activeTab === "stats" && (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-neutral-200 p-3">
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium text-neutral-600">
                                선수
                                <select
                                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                                  value={selectedPlayerId}
                                  onChange={(e) => {
                                    setSelectedPlayerId(e.target.value);
                                    setScoreDraft((prev) => ({ ...prev, playerId: e.target.value }));
                                  }}
                                >
                                  {rosterPlayers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.fullName}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200"
                                onClick={() => selected && void loadStats(selected.id)}
                              >
                                새로고침
                              </button>
                              {selectedAgg && (
                                <span
                                  className={[
                                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                                    selectedAgg.isVerified ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-700",
                                  ].join(" ")}
                                >
                                  {selectedAgg.isVerified
                                    ? `Verified (${selectedAgg.sampleCount}/7+)`
                                    : `검토중 (${selectedAgg.sampleCount}/7)`}
                                </span>
                              )}
                              {finalizer && (
                                <button
                                  type="button"
                                  className="rounded-md bg-[#5a1010] px-3 py-1.5 text-sm font-semibold text-white"
                                  onClick={() => void approveScores().catch((e) => setStatsErr((e as Error).message))}
                                >
                                  최종 승인
                                </button>
                              )}
                            </div>
                            {selectedAgg && (
                              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                                <div>신체 {selectedAgg.averages.physical}</div>
                                <div>기술 {selectedAgg.averages.skill}</div>
                                <div>전술 {selectedAgg.averages.tactical}</div>
                                <div>출결 {selectedAgg.averages.attendanceMetric}</div>
                                <div>멘탈 {selectedAgg.averages.mental}</div>
                              </div>
                            )}
                            {selectedAgg?.latestApprovedAt && (
                              <p className="mt-2 text-xs text-neutral-500">최근 승인: {new Date(selectedAgg.latestApprovedAt).toLocaleString()}</p>
                            )}
                          </div>

                          {coachWrite && (
                            <div className="rounded-lg border border-neutral-200 p-3">
                              <div className="text-sm font-semibold text-neutral-900">스탯 입력</div>
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {(["physical", "skill", "tactical", "attendanceMetric", "mental"] as const).map((k) => (
                                  <label key={k} className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                                    {k}
                                    <input
                                      type="number"
                                      min={0}
                                      max={10}
                                      step={0.1}
                                      value={scoreDraft[k]}
                                      onChange={(e) => setScoreDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                                      className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                                    />
                                  </label>
                                ))}
                              </div>
                              <textarea
                                className="mt-2 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                                placeholder="코멘트"
                                value={scoreDraft.coachComment}
                                onChange={(e) => setScoreDraft((prev) => ({ ...prev, coachComment: e.target.value }))}
                              />
                              <button
                                type="button"
                                className="mt-2 rounded-md bg-[#5a1010] px-3 py-1.5 text-sm font-semibold text-white"
                                onClick={() => void submitScore().catch((e) => setStatsErr((e as Error).message))}
                              >
                                입력 저장
                              </button>
                            </div>
                          )}

                          {statsErr && <p className="text-sm text-red-600">{statsErr}</p>}
                          {statsLoading && <p className="text-sm text-neutral-500">스탯 로딩 중…</p>}
                          {!statsLoading && (
                            <div className="space-y-2">
                              {statsItems.map((s) => (
                                <div key={s.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-medium text-neutral-900">
                                      {s.playerName}
                                      {selectedPlayerName && s.playerId === selectedPlayerId ? " (선택)" : ""}
                                    </div>
                                    <div className="text-xs text-neutral-500">{s.coachDisplayName || s.coachUserId}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-600">
                                    P {s.physical} · S {s.skill} · T {s.tactical} · A {s.attendanceMetric} · M {s.mental}
                                  </div>
                                  {s.coachComment && <p className="mt-1 text-neutral-800">{s.coachComment}</p>}
                                </div>
                              ))}
                              {statsItems.length === 0 && <p className="text-sm text-neutral-500">해당 조건의 스탯이 없습니다.</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </MediaPlaybackProvider>
            )}
          </div>
        </div>
      )}

      {!loading && archives.length === 0 && (
        <p className="text-sm text-neutral-600">등록된 영상이 없습니다. 코치·매니저는 위에서 새 영상을 추가할 수 있습니다.</p>
      )}
    </div>
  );
}
