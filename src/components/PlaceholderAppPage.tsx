"use client";

import { AccessGuard } from "@/components/AccessGuard";
import type { AppPageId } from "@/lib/permissions/viewControl";

export function PlaceholderAppPage({ page, title }: { page: AppPageId; title: string }) {
  return (
    <AccessGuard page={page}>
      <div className="card">
        <div className="card-body empty-state">
          <i className="fas fa-box-open"></i>
          <p>
            <strong>{title}</strong> 화면은 레거시 JS에서 이관 중입니다. (서비스 계층은 연결됨)
          </p>
        </div>
      </div>
    </AccessGuard>
  );
}
