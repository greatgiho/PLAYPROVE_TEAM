import type { VideoArchiveSourceType, VideoPlaybackKind } from "./types";

/**
 * 재생 백엔드 분기. INTERNAL 은 추후 CDN/서명 URL/`core.media` 등으로 바꿔도 이 함수만 조정하면 됩니다.
 */
export function resolvePlaybackKind(sourceType: VideoArchiveSourceType): VideoPlaybackKind {
  return sourceType === "YOUTUBE" ? "youtube" : "html5";
}

/** watch / embed / shorts / youtu.be */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const urlStr = rawUrl.trim();
  if (!urlStr) return null;
  try {
    const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const embed = u.pathname.match(/\/embed\/([\w-]{11})/);
      if (embed) return embed[1];
      const shorts = u.pathname.match(/\/shorts\/([\w-]{11})/);
      if (shorts) return shorts[1];
    }
    return null;
  } catch {
    return null;
  }
}
