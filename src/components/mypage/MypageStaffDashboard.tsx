"use client";

import { RosterFace } from "@/components/roster/RosterFace";
import type { MypageStaffContext, MypageStaffDbProfile } from "@/lib/types/mypageStaffContext";
import { teamRoleLabel } from "@/lib/types/roles";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  context: MypageStaffContext;
  onReload: () => void;
};

function formatJoined(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

function StaffProfileForm({ initial, onSaved }: { initial: MypageStaffDbProfile; onSaved: () => void }) {
  const [academicMajor, setAcademicMajor] = useState(initial.academicMajor ?? "");
  const [staffResponsibilities, setStaffResponsibilities] = useState(initial.staffResponsibilities ?? "");
  const [coachingCareerNotes, setCoachingCareerNotes] = useState(initial.coachingCareerNotes ?? "");
  const [coachingUnit, setCoachingUnit] = useState(initial.coachingUnit ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setAcademicMajor(initial.academicMajor ?? "");
    setStaffResponsibilities(initial.staffResponsibilities ?? "");
    setCoachingCareerNotes(initial.coachingCareerNotes ?? "");
    setCoachingUnit(initial.coachingUnit ?? "");
  }, [initial.academicMajor, initial.staffResponsibilities, initial.coachingCareerNotes, initial.coachingUnit]);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-body" style={{ padding: 20 }}>
        <div className="section-title" style={{ marginBottom: 14, fontSize: 15 }}>
          <i className="fas fa-edit" style={{ marginRight: 8 }} />
          DB 프로필 편집
        </div>
        <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 16, lineHeight: 1.6 }}>
          전공·담당 업무·코칭 경력은 <code>core.profiles</code> 컬럼에 저장됩니다. 항목은 줄바꿈으로 구분해 적으면 목록으로
          나뉩니다.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-700)" }}>전공·자격</span>
            <input
              className="form-control"
              value={academicMajor}
              onChange={(e) => setAcademicMajor(e.target.value)}
              placeholder="예: 스포츠 매니지먼트"
              style={{ maxWidth: 480 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-700)" }}>담당 업무·유지 기록</span>
            <textarea
              className="form-control"
              value={staffResponsibilities}
              onChange={(e) => setStaffResponsibilities(e.target.value)}
              rows={5}
              placeholder={"한 줄에 한 항목 (줄바꿈으로 구분)\n예: 회비 정산\n예: 가입 서류 검수"}
              style={{ maxWidth: 640, resize: "vertical" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-700)" }}>코칭 담당 유닛/파트</span>
            <input
              className="form-control"
              value={coachingUnit}
              onChange={(e) => setCoachingUnit(e.target.value)}
              placeholder="예: offense, defense, special, team"
              style={{ maxWidth: 320 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-700)" }}>코칭 경력·이력</span>
            <textarea
              className="form-control"
              value={coachingCareerNotes}
              onChange={(e) => setCoachingCareerNotes(e.target.value)}
              rows={5}
              placeholder={"한 줄에 한 문장\n2018–2022: …"}
              style={{ maxWidth: 640, resize: "vertical" }}
            />
          </label>
          {msg ? (
            <div style={{ fontSize: 13, color: msg.startsWith("저장") ? "var(--green)" : "var(--red)" }}>{msg}</div>
          ) : null}
          <div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                setMsg(null);
                void (async () => {
                  try {
                    const res = await fetch("/api/mypage/context", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        academicMajor,
                        staffResponsibilities,
                        coachingCareerNotes,
                        coachingUnit,
                      }),
                    });
                    const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
                    if (!res.ok) {
                      setMsg(j.message ?? j.error ?? `저장 실패 (${res.status})`);
                      return;
                    }
                    onSaved();
                    setMsg("저장했습니다.");
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionList({
  title,
  subtitle,
  blocks,
}: {
  title: string;
  subtitle?: string;
  blocks: { title: string; items: string[] }[];
}) {
  if (!blocks.length) return null;
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-body" style={{ padding: 20 }}>
        <div className="section-title" style={{ marginBottom: 8, fontSize: 15 }}>
          {title}
        </div>
        {subtitle ? (
          <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 18, lineHeight: 1.65 }}>{subtitle}</p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {blocks.map((block) => (
            <div key={block.title}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--gray-900)", marginBottom: 10 }}>{block.title}</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--gray-700)", fontSize: 13, lineHeight: 1.7 }}>
                {block.items.map((item) => (
                  <li key={`${block.title}-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MypageStaffDashboard({ context, onReload }: Props) {
  const display = context.displayName?.trim() || "이름 미등록";
  const mainPhoto = context.avatarUrl ?? context.personalAvatarUrl ?? null;
  const showPersonalBadge =
    Boolean(context.avatarUrl) && Boolean(context.personalAvatarUrl) && context.avatarUrl !== context.personalAvatarUrl;

  const roleTag = useMemo(() => {
    const base = teamRoleLabel(context.teamRole);
    if (context.staffTitle) return `${base} · ${context.staffTitle}`;
    return base;
  }, [context.teamRole, context.staffTitle]);

  return (
    <>
      <div className="mypage-hero">
        <div className="mypage-hero-content">
          <div className="mypage-avatar" style={{ padding: 0, overflow: "visible", background: "transparent" }}>
            <div style={{ position: "relative", width: 88, height: 88 }}>
              <RosterFace name={display} photoUrl={mainPhoto} size={88} />
              {showPersonalBadge && context.personalAvatarUrl ? (
                <img
                  src={context.personalAvatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid rgba(255,255,255,0.95)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                />
              ) : null}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="mypage-name">{display}</div>
            <div className="mypage-pos">{context.teamName}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginTop: 6 }}>{roleTag}</div>
            {context.coachFocusSummary ? (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.88)",
                  maxWidth: 520,
                }}
              >
                {context.coachFocusSummary}
              </p>
            ) : null}
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              팀 합류일: {formatJoined(context.joinedAtIso)}
              {context.phone ? (
                <>
                  {" "}
                  · 연락처: <span style={{ fontWeight: 600 }}>{context.phone}</span>
                </>
              ) : null}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "12px 16px",
              minWidth: 160,
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 10,
                opacity: 0.6,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 6,
              }}
            >
              바로가기
            </div>
            <Link href="/app/roster" style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: 13 }}>
              로스터
            </Link>
            <Link href="/app/dashboard" style={{ display: "block", marginTop: 8, color: "#fff", fontWeight: 700, fontSize: 13 }}>
              대시보드
            </Link>
          </div>
        </div>
      </div>

      <div className="mypage-cards">
        {context.stats.map((s) => (
          <div key={s.label} className="mypage-stat-card">
            <div className="mypage-stat-val" style={{ fontSize: 22 }}>
              {s.value}
            </div>
            <div className="mypage-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {context.sectionsDb.length ? (
        <SectionList
          title="등록된 프로필 (DB)"
          subtitle="Supabase `core.profiles` 의 `academic_major`, `staff_responsibilities`, `coaching_*` 컬럼 값입니다."
          blocks={context.sectionsDb}
        />
      ) : (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-body" style={{ padding: 20, fontSize: 14, color: "var(--gray-600)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--gray-900)" }}>DB 스태프 필드가 비어 있습니다.</strong> 아래「DB 프로필 편집」에서
            입력하거나, <code>npx prisma db seed</code> 로 데모 값을 채울 수 있습니다.
          </div>
        </div>
      )}

      <StaffProfileForm initial={context.dbProfile} onSaved={onReload} />

      <SectionList
        title="역할별 추천 체크리스트"
        subtitle="템플릿 가이드입니다. 실제 운영 규정에 맞게 조정하세요."
        blocks={context.sectionsGuide}
      />
    </>
  );
}
