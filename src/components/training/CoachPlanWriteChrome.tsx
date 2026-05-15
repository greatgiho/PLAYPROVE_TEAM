"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function CoachPlanWriteChrome({
  title,
  children,
  coachPlansSchemaMissing,
  err,
  loading,
}: {
  title: string;
  children: ReactNode;
  coachPlansSchemaMissing: boolean;
  err: string | null;
  loading: boolean;
}) {
  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-pencil-ruler" /> {title}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/practice_plan" className="btn btn-sm">
            <i className="fas fa-clipboard-list" /> 매니지먼트 · 취합 보드
          </Link>
          <Link href="/app/attendance" className="btn btn-sm">
            출결·일정
          </Link>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 20, maxWidth: 900 }}>
        훈련 일정을 선택한 뒤 세부 계획을 작성합니다. 훈련 <strong>시작 1시간 전</strong>까지 수정할 수 있습니다.
      </p>

      {coachPlansSchemaMissing ? (
        <div
          style={{
            background: "var(--yellow-bg, #fff8e6)",
            border: "1px solid #e9c46a",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--gray-800)",
            maxWidth: 900,
          }}
        >
          <strong>DB에 training.event_coach_plans 테이블이 없습니다.</strong>{" "}
          <code style={{ fontSize: 11 }}>database/training_event_coach_plans.sql</code> 또는{" "}
          <code style={{ fontSize: 11 }}>npx prisma migrate deploy</code> 후 새로고침하세요.
        </div>
      ) : null}

      {err ? <div style={{ color: "var(--danger, #b42318)", marginBottom: 12, fontSize: 13 }}>{err}</div> : null}
      {loading ? <p style={{ color: "var(--gray-600)" }}>불러오는 중…</p> : null}

      {!loading ? children : null}
    </div>
  );
}
