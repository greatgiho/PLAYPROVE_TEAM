export type DbAttendanceRow = {
  player_id: string;
  player_name: string;
  primary_position: string | null;
  player_status: string;
  attendance_id: string | null;
  status: "attending" | "absent" | "undecided";
  absence_reason: string | null;
};
