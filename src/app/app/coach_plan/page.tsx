"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { CoachPlanWriteSchedulePage } from "@/components/training/CoachPlanWriteSchedulePage";
import { useSession } from "@/lib/context/SessionContext";

export default function Page() {
  const { session } = useSession();
  return (
    <AccessGuard page="coach_plan">
      <CoachPlanWriteSchedulePage userId={session?.userId} />
    </AccessGuard>
  );
}
