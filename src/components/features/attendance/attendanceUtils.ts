import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function eventCardEmoji(ev: TeamEventDto): string {
  return ev.session_kind === "seminar" ? "📋" : "🏈";
}

export function eventCardCssClass(ev: TeamEventDto): string {
  return ev.session_kind === "seminar" ? "meeting" : "practice";
}
