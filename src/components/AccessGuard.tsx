"use client";

import { useSession } from "@/lib/context/SessionContext";
import { accessDeniedMessage, canAccessPage } from "@/lib/permissions/viewControl";
import type { AppPageId } from "@/lib/permissions/viewControl";
import Link from "next/link";

export function AccessGuard({ page, children }: { page: AppPageId; children: React.ReactNode }) {
  const { session } = useSession();
  if (!session) return null;

  if (!canAccessPage(session.teamRole, session.viewMode, page)) {
    return (
      <div className="access-denied-wrap">
        <div className="access-denied-icon">🔒</div>
        <div className="access-denied-title">접근 권한 없음</div>
        <div className="access-denied-msg">{accessDeniedMessage(session.teamRole, session.viewMode, page)}</div>
        <Link className="btn btn-primary" href="/app/mypage" style={{ marginTop: 20, display: "inline-flex" }}>
          <i className="fas fa-home"></i> 내 페이지로 이동
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
