import { readTeamDb, writeTeamDb } from "@/lib/services/local/teamDb";
import { seedTeamDatabase } from "@/lib/services/local/seed";

export function ensureTeamDbSeeded() {
  if (typeof window === "undefined") return;
  const db = readTeamDb();
  if (db.players.length === 0) {
    writeTeamDb(seedTeamDatabase());
  }
}
