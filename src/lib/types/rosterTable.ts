/**
 * 로스터 표(선수 / 코칭스태프 공통 행). 선수는 Player에서, 스태프는 TeamMember에서 매핑.
 */
export type RosterRowKind = "player" | "staff";

export interface RosterTableRow {
  id: string;
  kind: RosterRowKind;
  full_name: string;
  phone: string | null;
  jersey_number: number | null;
  unit: string;
  primary_position: string;
  player_status: string;
}
