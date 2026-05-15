"use client";

import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import {
  formatEventBoxDate,
  formatEventBoxTime,
  summarizeMyCoachPlans,
} from "@/components/training/coachPlanUtils";
import Link from "next/link";

const TONE_CLASS: Record<ReturnType<typeof summarizeMyCoachPlans>["tone"], string> = {
  empty: "coach-plan-box-status--empty",
  draft: "coach-plan-box-status--draft",
  submitted: "coach-plan-box-status--submitted",
  confirmed: "coach-plan-box-status--confirmed",
  mixed: "coach-plan-box-status--mixed",
};

export function CoachPlanScheduleGrid({
  events,
  userId,
}: {
  events: TeamEventDto[];
  userId: string | undefined;
}) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-calendar" />
        <p>훈련 일정이 없습니다. 출결 관리에서 훈련으로 등록된 일정을 추가해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="coach-plan-schedule-grid">
      {events.map((ev) => {
        const summary = summarizeMyCoachPlans(ev.coach_plans, userId);
        const total = ev.coach_plans?.length ?? 0;
        return (
          <Link
            key={ev.id}
            href={`/app/coach_plan/${ev.id}`}
            className="coach-plan-schedule-box"
          >
            <div className="coach-plan-schedule-box-date">{formatEventBoxDate(ev.starts_at)}</div>
            <div className="coach-plan-schedule-box-time">{formatEventBoxTime(ev.starts_at)}</div>
            <div className="coach-plan-schedule-box-title">
              {ev.title.length > 28 ? `${ev.title.slice(0, 28)}…` : ev.title}
            </div>
            {ev.location ? (
              <div className="coach-plan-schedule-box-loc">
                <i className="fas fa-map-marker-alt" aria-hidden /> {ev.location}
              </div>
            ) : null}
            <div className={`coach-plan-schedule-box-status ${TONE_CLASS[summary.tone]}`}>{summary.label}</div>
            <div className="coach-plan-schedule-box-meta">팀 전체 {total}건</div>
          </Link>
        );
      })}
    </div>
  );
}
