"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { RosterPageView } from "@/components/features/roster";

export default function RosterPage() {
  return (
    <AccessGuard page="roster">
      <RosterPageView />
    </AccessGuard>
  );
}
