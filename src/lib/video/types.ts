/** DB `training.video_archive_source_type` 와 동일 — 클라이언트는 Prisma 의존 최소화 */
export type VideoArchiveSourceType = "YOUTUBE" | "INTERNAL";

export type VideoArchiveDto = {
  id: string;
  teamId: string;
  eventId: string | null;
  title: string;
  sourceType: VideoArchiveSourceType;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type VideoFeedbackDto = {
  id: string;
  videoArchiveId: string;
  timestampSeconds: number;
  content: string;
  authorUserId: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  taggedPlayerId: string | null;
  taggedPlayerName: string | null;
  createdAt: string;
};

export type VideoPlaybackKind = "youtube" | "html5";

export type VideoPerformanceScoreDto = {
  id: string;
  playerId: string;
  playerName: string;
  coachUserId: string;
  coachDisplayName: string | null;
  evaluatedOn: string;
  physical: number;
  skill: number;
  tactical: number;
  attendanceMetric: number;
  mental: number;
  coachComment: string | null;
  metadata: Record<string, unknown> | null;
};

export type VideoPerformanceAggregateDto = {
  playerId: string;
  sampleCount: number;
  isVerified: boolean;
  averages: {
    physical: number;
    skill: number;
    tactical: number;
    attendanceMetric: number;
    mental: number;
  };
  latestApprovedAt: string | null;
};
