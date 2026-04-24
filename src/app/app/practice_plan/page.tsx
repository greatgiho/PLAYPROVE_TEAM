"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { CoachPlanPageContent } from "@/components/training/CoachPlanPageContent";
import { useSession } from "@/lib/context/SessionContext";

export default function Page() {
  const { session } = useSession();
  return (
    <AccessGuard page="practice_plan">
      <CoachPlanPageContent mode="aggregate" teamRole={session?.teamRole} userId={session?.userId} />
    </AccessGuard>
  );
}
