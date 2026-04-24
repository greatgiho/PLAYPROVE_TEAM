"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { AttendancePageView } from "@/components/features/attendance";

export default function AttendancePage() {
  return (
    <AccessGuard page="attendance">
      <AttendancePageView />
    </AccessGuard>
  );
}
