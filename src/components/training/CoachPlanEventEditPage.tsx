"use client";

import { CoachPlanEventEditor } from "@/components/training/CoachPlanEventEditor";
import { CoachPlanWriteChrome } from "@/components/training/CoachPlanWriteChrome";
import { filterTrainingEvents } from "@/components/training/coachPlanUtils";
import { useCoachPlanEvents } from "@/components/training/useCoachPlanEvents";
import { useCoachPlanRoleHint } from "@/components/training/useCoachPlanRoleHint";
import { useMemo } from "react";

export function CoachPlanEventEditPage({
  eventId,
  teamRole,
  userId,
}: {
  eventId: string;
  teamRole: string | undefined;
  userId: string | undefined;
}) {
  const { events, loading, err, coachPlansSchemaMissing, reload, teamCode } = useCoachPlanEvents();
  const roleTitleHint = useCoachPlanRoleHint(teamRole);
  const ev = useMemo(() => filterTrainingEvents(events).find((e) => e.id === eventId) ?? null, [events, eventId]);

  if (!teamCode) {
    return (
      <div className="empty-state">
        이 화면은 DB 연동 모드에서만 사용할 수 있습니다.
      </div>
    );
  }

  return (
    <CoachPlanWriteChrome
      title="세부계획 입력"
      coachPlansSchemaMissing={coachPlansSchemaMissing}
      err={err}
      loading={loading}
    >
      {!loading && !ev ? (
        <div className="empty-state">
          <p>일정을 찾을 수 없습니다.</p>
        </div>
      ) : ev ? (
        <CoachPlanEventEditor
          ev={ev}
          teamRole={teamRole}
          userId={userId}
          coachPlansSchemaMissing={coachPlansSchemaMissing}
          roleTitleHint={roleTitleHint}
          onReload={reload}
        />
      ) : null}
    </CoachPlanWriteChrome>
  );
}
