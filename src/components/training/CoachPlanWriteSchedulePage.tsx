"use client";

import { CoachPlanScheduleGrid } from "@/components/training/CoachPlanScheduleGrid";
import { CoachPlanWriteChrome } from "@/components/training/CoachPlanWriteChrome";
import { filterTrainingEvents } from "@/components/training/coachPlanUtils";
import { useCoachPlanEvents } from "@/components/training/useCoachPlanEvents";
import { hasPlayproveTeamCode } from "@/lib/config";
import { useMemo } from "react";

export function CoachPlanWriteSchedulePage({
  userId,
}: {
  userId: string | undefined;
}) {
  const { events, loading, err, coachPlansSchemaMissing, teamCode } = useCoachPlanEvents();
  const trainingEvents = useMemo(() => filterTrainingEvents(events), [events]);

  if (!teamCode) {
    return (
      <div className="empty-state">
        이 화면은 DB 연동 모드에서만 사용할 수 있습니다.{" "}
        <code style={{ fontSize: 12 }}>NEXT_PUBLIC_PLAYPROVE_TEAM_CODE</code> 를 설정한 뒤 다시 열어 주세요.
      </div>
    );
  }

  if (!hasPlayproveTeamCode()) {
    return null;
  }

  return (
    <CoachPlanWriteChrome
      title="훈련계획 작성"
      coachPlansSchemaMissing={coachPlansSchemaMissing}
      err={err}
      loading={loading}
    >
      <CoachPlanScheduleGrid events={trainingEvents} userId={userId} />
    </CoachPlanWriteChrome>
  );
}
