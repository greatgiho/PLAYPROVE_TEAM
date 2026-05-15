"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractYouTubeVideoId, resolvePlaybackKind } from "./videoSourceResolver";
import type { VideoArchiveSourceType } from "./types";
import { ensureYouTubeIframeApi, type YtPlayerMinimal } from "./youtubeIframeApi";

export type VideoControllerApi = {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  play: () => void;
  pause: () => void;
  isReady: boolean;
  playbackKind: "youtube" | "html5";
};

type UseVideoControllerArgs = {
  sourceType: VideoArchiveSourceType;
  sourceUrl: string;
  /** 외부 타임라인·목차에서 점프할 재생 위치(초). */
  targetTime?: number | null;
  /** 같은 초로 다시 점프할 때마다 증가시키면 즉시 seek 이 반복 적용됩니다. */
  targetTimeRevision?: number;
  /** YouTube 전용: `YT.Player`가 붙을 DOM id (페이지당 유일) */
  youtubePlayerDomId: string;
};

/**
 * YouTube IFrame API vs HTML5 `<video>` 재생을 동일한 명령형 API로 감쌉니다.
 * 자체 호스팅/서명 URL 전환 시 `INTERNAL` 분기만 바꾸면 됩니다.
 */
export function useVideoController({
  sourceType,
  sourceUrl,
  targetTime,
  targetTimeRevision = 0,
  youtubePlayerDomId,
}: UseVideoControllerArgs): VideoControllerApi & { htmlVideoRef: React.RefObject<HTMLVideoElement | null> } {
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<YtPlayerMinimal | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingSeekRef = useRef<number | null>(null);
  const lastAppliedRef = useRef<{ t: number | null | undefined; rev: number }>({ t: undefined, rev: -1 });

  const playbackKind = useMemo(() => resolvePlaybackKind(sourceType), [sourceType]);
  const youtubeVideoId = useMemo(() => {
    if (playbackKind !== "youtube") return null;
    return extractYouTubeVideoId(sourceUrl);
  }, [playbackKind, sourceUrl]);

  const seekTo = useCallback(
    (seconds: number) => {
      const t = Math.max(0, seconds);
      if (playbackKind === "html5") {
        const el = htmlVideoRef.current;
        if (!el) {
          pendingSeekRef.current = t;
          return;
        }
        try {
          el.currentTime = t;
        } catch {
          /* ignore */
        }
        return;
      }
      const p = ytRef.current;
      if (!p) {
        pendingSeekRef.current = t;
        return;
      }
      p.seekTo(t, true);
    },
    [playbackKind],
  );

  const getCurrentTime = useCallback((): number => {
    if (playbackKind === "html5") {
      return htmlVideoRef.current?.currentTime ?? 0;
    }
    try {
      return ytRef.current?.getCurrentTime() ?? 0;
    } catch {
      return 0;
    }
  }, [playbackKind]);

  const play = useCallback(() => {
    if (playbackKind === "html5") {
      void htmlVideoRef.current?.play().catch(() => {});
      return;
    }
    ytRef.current?.playVideo();
  }, [playbackKind]);

  const pause = useCallback(() => {
    if (playbackKind === "html5") {
      htmlVideoRef.current?.pause();
      return;
    }
    ytRef.current?.pauseVideo();
  }, [playbackKind]);

  useEffect(() => {
    setIsReady(false);
    ytRef.current = null;
    pendingSeekRef.current = null;
    lastAppliedRef.current = { t: undefined, rev: -1 };
  }, [playbackKind, sourceUrl, youtubeVideoId]);

  useEffect(() => {
    if (playbackKind !== "html5") return;
    const el = htmlVideoRef.current;
    if (!el) return;
    const onMeta = () => {
      setIsReady(true);
      if (pendingSeekRef.current != null) {
        el.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    if (el.readyState >= 1) onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [playbackKind, sourceUrl]);

  useEffect(() => {
    if (playbackKind !== "youtube") return;
    if (!youtubeVideoId) {
      setIsReady(false);
      return;
    }
    let cancelled = false;
    let player: YtPlayerMinimal | null = null;

    (async () => {
      try {
        await ensureYouTubeIframeApi();
        if (cancelled || !window.YT?.Player) return;
        player = new window.YT.Player(youtubePlayerDomId, {
          videoId: youtubeVideoId,
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              ytRef.current = e.target;
              setIsReady(true);
              if (pendingSeekRef.current != null) {
                e.target.seekTo(pendingSeekRef.current, true);
                pendingSeekRef.current = null;
              }
            },
            onError: () => setIsReady(false),
          },
        });
      } catch {
        if (!cancelled) setIsReady(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      ytRef.current = null;
      setIsReady(false);
    };
  }, [playbackKind, youtubePlayerDomId, youtubeVideoId]);

  useEffect(() => {
    if (targetTime == null || Number.isNaN(targetTime)) return;
    if (!isReady) {
      pendingSeekRef.current = targetTime;
      return;
    }
    const prev = lastAppliedRef.current;
    if (prev.t === targetTime && prev.rev === targetTimeRevision) return;
    lastAppliedRef.current = { t: targetTime, rev: targetTimeRevision };
    seekTo(targetTime);
  }, [targetTime, targetTimeRevision, isReady, seekTo]);

  return {
    htmlVideoRef,
    seekTo,
    getCurrentTime,
    play,
    pause,
    isReady,
    playbackKind,
  };
}
