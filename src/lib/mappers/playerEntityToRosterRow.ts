import type { Player } from "@/lib/types/entities";
import type { RosterTableRow } from "@/lib/types/rosterTable";

export function playerEntityToRosterRow(p: Player): RosterTableRow {
  return {
    id: p.id,
    kind: "player",
    full_name: p.full_name,
    phone: p.phone,
    jersey_number: p.jersey_number,
    unit: p.unit,
    primary_position: p.primary_position,
    player_status: p.player_status,
  };
}
