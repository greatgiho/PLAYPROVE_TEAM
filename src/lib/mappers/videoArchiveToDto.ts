import type { VideoArchive } from "@prisma/client";
import type {
  VideoArchiveDto,
  VideoArchiveSourceType,
  VideoFeedbackDto,
  VideoPerformanceAggregateDto,
  VideoPerformanceScoreDto,
} from "@/lib/video/types";

function sourceTypeToDto(v: VideoArchive["sourceType"]): VideoArchiveSourceType {
  return v === "YOUTUBE" || v === "INTERNAL" ? v : "INTERNAL";
}

export function videoArchiveToDto(row: VideoArchive): VideoArchiveDto {
  return {
    id: row.id,
    teamId: row.teamId,
    eventId: row.eventId,
    title: row.title,
    sourceType: sourceTypeToDto(row.sourceType),
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function videoFeedbackToDto(row: {
  id: string;
  videoArchiveId: string;
  timestampSeconds: number;
  content: string;
  authorUserId: string;
  taggedPlayerId: string | null;
  createdAt: Date;
  author: {
    profiles_profiles_idTousers: { displayName: string | null; avatarUrl: string | null } | null;
  };
  taggedPlayer: { fullName: string } | null;
}): VideoFeedbackDto {
  return {
    id: row.id,
    videoArchiveId: row.videoArchiveId,
    timestampSeconds: row.timestampSeconds,
    content: row.content,
    authorUserId: row.authorUserId,
    authorDisplayName: row.author.profiles_profiles_idTousers?.displayName ?? null,
    authorAvatarUrl: row.author.profiles_profiles_idTousers?.avatarUrl ?? null,
    taggedPlayerId: row.taggedPlayerId,
    taggedPlayerName: row.taggedPlayer?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function videoPerformanceScoreToDto(row: {
  id: string;
  playerId: string;
  coachUserId: string;
  evaluatedOn: Date;
  physical: { toNumber: () => number };
  skill: { toNumber: () => number };
  tactical: { toNumber: () => number };
  attendanceMetric: { toNumber: () => number };
  mental: { toNumber: () => number };
  coachComment: string | null;
  metadata: unknown;
  player: { fullName: string };
  users_performance_scores_coach_user_idTousers: {
    profiles_profiles_idTousers: { displayName: string | null } | null;
  };
}): VideoPerformanceScoreDto {
  return {
    id: row.id,
    playerId: row.playerId,
    playerName: row.player.fullName,
    coachUserId: row.coachUserId,
    coachDisplayName: row.users_performance_scores_coach_user_idTousers.profiles_profiles_idTousers?.displayName ?? null,
    evaluatedOn: row.evaluatedOn.toISOString(),
    physical: row.physical.toNumber(),
    skill: row.skill.toNumber(),
    tactical: row.tactical.toNumber(),
    attendanceMetric: row.attendanceMetric.toNumber(),
    mental: row.mental.toNumber(),
    coachComment: row.coachComment,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
  };
}

export function computeVideoPerformanceAggregate(rows: VideoPerformanceScoreDto[]): VideoPerformanceAggregateDto | null {
  if (rows.length === 0) return null;
  const playerId = rows[0]!.playerId;
  const sum = rows.reduce(
    (acc, r) => ({
      physical: acc.physical + r.physical,
      skill: acc.skill + r.skill,
      tactical: acc.tactical + r.tactical,
      attendanceMetric: acc.attendanceMetric + r.attendanceMetric,
      mental: acc.mental + r.mental,
    }),
    { physical: 0, skill: 0, tactical: 0, attendanceMetric: 0, mental: 0 },
  );
  const sampleCount = rows.length;
  const approvedDates = rows
    .map((r) => {
      const v = r.metadata?.videoReviewApprovedAt;
      return typeof v === "string" ? v : null;
    })
    .filter((v): v is string => Boolean(v))
    .sort();
  return {
    playerId,
    sampleCount,
    isVerified: sampleCount >= 7,
    averages: {
      physical: Number((sum.physical / sampleCount).toFixed(2)),
      skill: Number((sum.skill / sampleCount).toFixed(2)),
      tactical: Number((sum.tactical / sampleCount).toFixed(2)),
      attendanceMetric: Number((sum.attendanceMetric / sampleCount).toFixed(2)),
      mental: Number((sum.mental / sampleCount).toFixed(2)),
    },
    latestApprovedAt: approvedDates.at(-1) ?? null,
  };
}
