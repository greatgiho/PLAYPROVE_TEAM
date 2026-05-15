"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { CoachPlanEventEditPage } from "@/components/training/CoachPlanEventEditPage";
import { useSession } from "@/lib/context/SessionContext";
import { useParams } from "next/navigation";

export default function Page() {
  const { session } = useSession();
  const params = useParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";

  return (
    <AccessGuard page="coach_plan">
      <CoachPlanEventEditPage eventId={eventId} teamRole={session?.teamRole} userId={session?.userId} />
    </AccessGuard>
  );
}
