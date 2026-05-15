"use client";

import { MediaContext } from "@prisma/client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { VideoArchiveDto } from "./types";

/**
 * 영상 세션 컨텍스트. Prisma `MediaContext` 는 향후 INTERNAL 소스가 `core.media` 와 연결될 때
 * 동일 Taxonomy 로 묶기 위한 확장 훅으로 둡니다(현재는 UI·분석용 메타).
 */
export type MediaPlaybackContextValue = {
  archive: VideoArchiveDto | null;
  relatedMediaContext: MediaContext;
};

const MediaPlaybackContext = createContext<MediaPlaybackContextValue | null>(null);

export function MediaPlaybackProvider({
  archive,
  relatedMediaContext,
  children,
}: {
  archive: VideoArchiveDto | null;
  /** 기본 POST: 팀 피드/기록류 확장 시 전용 값으로 교체 가능 */
  relatedMediaContext?: MediaContext;
  children: ReactNode;
}) {
  const value = useMemo<MediaPlaybackContextValue>(
    () => ({
      archive,
      relatedMediaContext: relatedMediaContext ?? MediaContext.POST,
    }),
    [archive, relatedMediaContext],
  );
  return <MediaPlaybackContext.Provider value={value}>{children}</MediaPlaybackContext.Provider>;
}

export function useMediaPlayback(): MediaPlaybackContextValue {
  const v = useContext(MediaPlaybackContext);
  if (!v) {
    throw new Error("useMediaPlayback must be used within MediaPlaybackProvider");
  }
  return v;
}

export function useMediaPlaybackOptional(): MediaPlaybackContextValue | null {
  return useContext(MediaPlaybackContext);
}
