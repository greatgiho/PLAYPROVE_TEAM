"use client";

import { useSession } from "@/lib/context/SessionContext";
import { teamRoleLabel } from "@/lib/types/roles";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FlowKey = "manager" | "head_coach" | "part_coach" | "player";

const STORAGE: Record<FlowKey, string> = {
  manager: "pp_demo_flow_manager",
  head_coach: "pp_demo_flow_head_coach",
  part_coach: "pp_demo_flow_part_coach",
  player: "pp_demo_flow_player",
};

const ROWS: { key: FlowKey; personaLabel: string; steps: string }[] = [
  {
    key: "manager",
    personaLabel: "매니저",
    steps: "로그인 → 선수단 관리 → 내 페이지 → 프로필 사진 저장",
  },
  {
    key: "head_coach",
    personaLabel: "헤드 코치",
    steps: "로그인 → 선수단 관리 → 내 페이지 → 프로필 사진 저장",
  },
  {
    key: "part_coach",
    personaLabel: "파트 코치",
    steps: "로그인 → 선수단 관리 → 내 페이지 → 프로필 사진 저장",
  },
  {
    key: "player",
    personaLabel: "선수",
    steps: "로그인 → 선수단 관리 → 내 페이지 → 프로필 사진 저장",
  },
];

function readChecked(key: FlowKey): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE[key]) === "1";
}

function writeChecked(key: FlowKey, checked: boolean) {
  window.localStorage.setItem(STORAGE[key], checked ? "1" : "0");
}

export function DemoScenarioChecklist() {
  const { session } = useSession();
  const [checks, setChecks] = useState<Record<FlowKey, boolean>>({
    manager: false,
    head_coach: false,
    part_coach: false,
    player: false,
  });

  useEffect(() => {
    setChecks({
      manager: readChecked("manager"),
      head_coach: readChecked("head_coach"),
      part_coach: readChecked("part_coach"),
      player: readChecked("player"),
    });
  }, []);

  const toggle = useCallback((key: FlowKey) => {
    const next = !readChecked(key);
    writeChecked(key, next);
    setChecks((c) => ({ ...c, [key]: next }));
  }, []);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ paddingBottom: 8 }}>
        <div className="card-title" style={{ fontSize: 15 }}>
          <i className="fas fa-tasks" style={{ marginRight: 8, color: "var(--primary)" }} />
          데모 시나리오 (회귀 체크)
        </div>
      </div>
      <div className="card-body" style={{ paddingTop: 4 }}>
        <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 14, lineHeight: 1.55 }}>
          역할별로 한 번씩 돌려 보세요. 체크는 이 브라우저에만 저장됩니다.{" "}
          <Link href="/login" style={{ fontWeight: 700 }}>
            로그인
          </Link>
          ·
          <Link href="/app/roster" style={{ fontWeight: 700 }}>
            로스터
          </Link>
          ·
          <Link href="/app/mypage" style={{ fontWeight: 700 }}>
            내 페이지
          </Link>
        </p>
        {session?.teamRole ? (
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>
            지금 계정: <strong style={{ color: "var(--gray-800)" }}>{teamRoleLabel(session.teamRole)}</strong>
          </div>
        ) : null}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {ROWS.map((row) => (
            <li
              key={row.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--gray-200)",
                background: session?.teamRole === row.key ? "rgba(112, 32, 31, 0.04)" : "var(--gray-50)",
              }}
            >
              <input
                type="checkbox"
                checked={checks[row.key]}
                onChange={() => toggle(row.key)}
                aria-label={`${row.personaLabel} 시나리오 완료`}
                style={{ marginTop: 3 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--gray-900)", marginBottom: 4 }}>
                  {row.personaLabel}
                </div>
                <div style={{ fontSize: 12, color: "var(--gray-600)", lineHeight: 1.5 }}>{row.steps}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
