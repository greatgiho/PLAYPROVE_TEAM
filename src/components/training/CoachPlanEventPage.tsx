"use client";

import { CoachPlanEventDetailView } from "@/components/training/CoachPlanEventDetailView";
import { CoachPlanWriteChrome } from "@/components/training/CoachPlanWriteChrome";
import { filterTrainingEvents } from "@/components/training/coachPlanUtils";
import { useCoachPlanEvents } from "@/components/training/useCoachPlanEvents";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { getPlayproveTeamCode } from "@/lib/config";
import { useMemo } from "react";

const teamCode = getPlayproveTeamCode();

export function CoachPlanEventPage({
  eventId,
  teamRole,
  userId,
}: {
  eventId: string;
  teamRole: string | undefined;
  userId: string | undefined;
}) {
  const { events, loading, err, coachPlansSchemaMissing, reload, teamCode } = useCoachPlanEvents();
  const ev = useMemo(() => filterTrainingEvents(events).find((e) => e.id === eventId) ?? null, [events, eventId]);

  const patchPlan = async (planId: string, body: Record<string, unknown>) => {
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(eventId)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(teamCode)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (!res.ok) {
      alert(apiErrorUserHint(res.status, j));
      return;
    }
    await reload();
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("이 세부 계획을 삭제할까요?")) return;
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(eventId)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(teamCode)}`,
      { method: "DELETE", credentials: "include" },
    );
    const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (!res.ok) {
      alert(apiErrorUserHint(res.status, j));
      return;
    }
    await reload();
  };

  if (!teamCode) {
    return (
      <div className="empty-state">
        이 화면은 DB 연동 모드에서만 사용할 수 있습니다.
      </div>
    );
  }

  return (
    <CoachPlanWriteChrome
      title="세부계획 조회"
      coachPlansSchemaMissing={coachPlansSchemaMissing}
      err={err}
      loading={loading}
    >
      {!loading && !ev ? (
        <div className="empty-state">
          <p>일정을 찾을 수 없습니다.</p>
        </div>
      ) : ev ? (
        <CoachPlanEventDetailView
          ev={ev}
          teamRole={teamRole}
          userId={userId}
          coachPlansSchemaMissing={coachPlansSchemaMissing}
          onDeletePlan={(id) => void deletePlan(id)}
          onPatchPlan={(id, body) => void patchPlan(id, body)}
        />
      ) : null}
    </CoachPlanWriteChrome>
  );
}
