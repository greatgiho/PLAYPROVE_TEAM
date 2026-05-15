"use client";

/** 최소 YT.Player 타입 — 전역 스크립트와 맞춤 */
export type YtPlayerMinimal = {
  destroy: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
};

type YtNamespace = {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: { target: YtPlayerMinimal }) => void; onError?: () => void };
    },
  ) => YtPlayerMinimal;
};

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT = "https://www.youtube.com/iframe_api";
const PROMISE_KEY = "__pp_yt_iframe_api_promise__";

function getPromiseSlot(): Promise<void> | undefined {
  return (window as unknown as Record<string, Promise<void> | undefined>)[PROMISE_KEY];
}

function setPromiseSlot(p: Promise<void>): void {
  (window as unknown as Record<string, Promise<void>>)[PROMISE_KEY] = p;
}

/** YouTube IFrame API 스크립트 1회 로드 */
export function ensureYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  const existing = getPromiseSlot();
  if (existing) return existing;

  const p = new Promise<void>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof prev === "function") prev();
      } finally {
        resolve();
      }
    };
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = SCRIPT;
      tag.async = true;
      tag.onerror = () => reject(new Error("youtube_iframe_api_load_failed"));
      document.head.appendChild(tag);
    } else if (window.YT?.Player) {
      resolve();
    }
    // 이미 스크립트만 있고 YT 미준비면 onYouTubeIframeAPIReady 가 호출될 때까지 대기
  });
  setPromiseSlot(p);
  return p;
}
