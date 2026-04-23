"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { teamRoleLabel, viewModeLabel } from "@/lib/types/roles";

export default function MyPage() {
  const { session } = useSession();
  return (
    <AccessGuard page="mypage">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-user-circle"></i> 내 페이지
          </div>
        </div>
        <div className="card-body" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, color: "var(--gray-700)" }}>
            <div>
              <strong>표시 이름:</strong> {session?.displayName}
            </div>
            <div>
              <strong>팀 역할:</strong> {session ? teamRoleLabel(session.teamRole) : "-"}
            </div>
            <div>
              <strong>현재 뷰:</strong> {session ? viewModeLabel(session.viewMode) : "-"}
            </div>
            <div>
              <strong>연결 선수 ID:</strong> {session?.playerId ?? "(없음)"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
            데이터는 <code>getTeamDataServices()</code> 를 통해 조회/변경하며, 저장소 구현체만 교체하면 Supabase/Prisma로 이전할 수 있습니다.
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}
