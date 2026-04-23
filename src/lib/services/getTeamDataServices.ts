import type { TeamDataServices } from "@/lib/services/contracts";
import { ensureTeamDbSeeded } from "@/lib/services/local/bootstrap";
import { LocalTeamDataServices } from "@/lib/services/local/localTeamDataServices";

let singleton: LocalTeamDataServices | null = null;

/**
 * 브라우저 전용 팩토리.
 * Supabase/Prisma 연동 시 이 함수만 `SupabaseTeamDataServices` 등으로 교체하면 됩니다.
 */
export function getTeamDataServices(): TeamDataServices {
  if (typeof window === "undefined") {
    throw new Error("getTeamDataServices() must be called from the browser.");
  }
  ensureTeamDbSeeded();
  singleton ??= new LocalTeamDataServices();
  return singleton;
}
