/** 로스터 primary_position → 훈련 파트(오/디/스페셜) 분류. 미매칭은 null */

const OFFENSE = new Set(
  ["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "OL", "OT", "OG", "IOL"].map((s) => s.toUpperCase()),
);

const DEFENSE = new Set(
  [
    "DE",
    "DT",
    "NT",
    "OLB",
    "ILB",
    "LB",
    "MLB",
    "CB",
    "FS",
    "SS",
    "S",
    "DB",
    "EDGE",
    "NB",
    "SAM",
    "WILL",
    "DL",
    "NICKEL",
  ].map((s) => s.toUpperCase()),
);

const SPECIAL = new Set(["K", "P", "LS", "PK", "KR", "PR", "KOS"].map((s) => s.toUpperCase()));

export type RosterTrainingUnit = "offense" | "defense" | "special";

export function rosterUnitFromPrimaryPosition(pos: string | null | undefined): RosterTrainingUnit | null {
  if (!pos?.trim()) return null;
  const u = pos.trim().toUpperCase();
  if (OFFENSE.has(u)) return "offense";
  if (DEFENSE.has(u)) return "defense";
  if (SPECIAL.has(u)) return "special";
  return null;
}
