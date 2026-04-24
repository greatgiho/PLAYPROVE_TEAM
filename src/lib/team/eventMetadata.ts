import type { Prisma } from "@prisma/client";

export type SessionKind = "training" | "seminar";
export type SeminarSubtype = "rule" | "video" | "mixed" | "other";

export type EventSessionMetadata = {
  session_kind?: SessionKind;
  seminar_subtype?: SeminarSubtype | string | null;
};

export function parseEventSessionMetadata(metadata: unknown): EventSessionMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const m = metadata as Record<string, unknown>;
  const session_kind = m.session_kind === "seminar" || m.session_kind === "training" ? m.session_kind : undefined;
  const seminar_subtype =
    typeof m.seminar_subtype === "string" && m.seminar_subtype.trim() ? m.seminar_subtype.trim() : null;
  return { session_kind, seminar_subtype };
}

export function buildEventMetadataPatch(input: {
  sessionKind: SessionKind;
  seminarSubtype?: SeminarSubtype | string | null;
}): Prisma.InputJsonValue {
  return {
    session_kind: input.sessionKind,
    seminar_subtype: input.sessionKind === "seminar" ? (input.seminarSubtype ?? "other") : null,
  } as Prisma.InputJsonValue;
}

export function seminarLabel(sub: string | null | undefined): string {
  const s = (sub ?? "other").toLowerCase();
  if (s === "rule") return "룰 세미나";
  if (s === "video") return "비디오 세미나";
  if (s === "mixed") return "복합 세미나";
  return "기타 세미나";
}
