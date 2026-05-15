"use client";

import { useVideoController } from "@/lib/video/useVideoController";
import type { VideoArchiveDto } from "@/lib/video/types";
import { extractYouTubeVideoId } from "@/lib/video/videoSourceResolver";
import { useCallback, useId, useMemo } from "react";

type ArchivePlayback = Pick<VideoArchiveDto, "sourceType" | "sourceUrl" | "title">;

export function VideoPlayerContainer({
  archive,
  targetTime,
  targetTimeRevision,
  coachCaptureEnabled,
  onTimestampCaptured,
  className,
}: {
  archive: ArchivePlayback;
  targetTime?: number | null;
  targetTimeRevision?: number;
  /** 코치 전용: INTERNAL 은 영상 클릭으로도 시각 캡처, YOUTUBE 는 버튼(iframe 한계) */
  coachCaptureEnabled?: boolean;
  onTimestampCaptured?: (seconds: number) => void;
  className?: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const youtubePlayerDomId = `pp-yt-${reactId}`;

  const { htmlVideoRef, getCurrentTime, play, pause, isReady, playbackKind } = useVideoController({
    sourceType: archive.sourceType,
    sourceUrl: archive.sourceUrl,
    targetTime,
    targetTimeRevision,
    youtubePlayerDomId,
  });

  const youtubeId = useMemo(
    () => (archive.sourceType === "YOUTUBE" ? extractYouTubeVideoId(archive.sourceUrl) : null),
    [archive.sourceType, archive.sourceUrl],
  );

  const emitCapture = useCallback(() => {
    const t = Math.floor(getCurrentTime());
    onTimestampCaptured?.(t);
  }, [getCurrentTime, onTimestampCaptured]);

  const onVideoClick = useCallback(() => {
    if (!coachCaptureEnabled) return;
    emitCapture();
  }, [coachCaptureEnabled, emitCapture]);

  const invalidYoutube = archive.sourceType === "YOUTUBE" && !youtubeId;

  return (
    <div className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-neutral-900">{archive.title}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
            onClick={() => play()}
          >
            재생
          </button>
          <button
            type="button"
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
            onClick={() => pause()}
          >
            일시정지
          </button>
          {coachCaptureEnabled && (
            <button
              type="button"
              className="rounded-md border border-[#5a1010]/30 bg-[#5a1010]/10 px-2.5 py-1 text-xs font-semibold text-[#5a1010] hover:bg-[#5a1010]/15"
              onClick={emitCapture}
              title="유튜브는 iframe 보안상 영상 위 클릭 캡처가 불가해 버튼으로 제공합니다"
            >
              이 시각 → 피드백
            </button>
          )}
        </div>
      </div>

      {invalidYoutube ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          유효한 YouTube URL 이 아닙니다. watch?v=, youtu.be/, /embed/ 형식을 사용해 주세요.
        </p>
      ) : (
        <div className="relative w-full overflow-hidden rounded-lg border border-neutral-200 bg-black shadow-sm">
          {playbackKind === "youtube" ? (
            <div className="aspect-video w-full">
              <div id={youtubePlayerDomId} className="h-full w-full" />
            </div>
          ) : (
            <video
              ref={htmlVideoRef}
              className="aspect-video w-full cursor-crosshair object-contain"
              src={archive.sourceUrl}
              controls
              playsInline
              preload="metadata"
              onClick={onVideoClick}
            />
          )}
          {!isReady && !invalidYoutube && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
              로딩 중…
            </div>
          )}
        </div>
      )}

      {coachCaptureEnabled && playbackKind === "html5" && (
        <p className="text-xs text-neutral-500">코치 모드: 영상을 클릭하면 현재 재생 시각이 피드백 타임스탬프로 들어갑니다.</p>
      )}
    </div>
  );
}
