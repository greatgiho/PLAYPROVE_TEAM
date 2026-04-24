"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { useState } from "react";
import { toDatetimeLocalValue } from "./attendanceUtils";

export function EventScheduleModal({
  teamCode,
  modal,
  onClose,
  onSaved,
}: {
  teamCode: string;
  modal: { mode: "create" } | { mode: "edit"; event: TeamEventDto };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ev = modal.mode === "edit" ? modal.event : null;
  const [title, setTitle] = useState(ev?.title ?? "");
  const [sessionKind, setSessionKind] = useState<"training" | "seminar">(ev?.session_kind ?? "training");
  const [seminarSubtype, setSeminarSubtype] = useState(ev?.seminar_subtype ?? "rule");
  const [startsLocal, setStartsLocal] = useState(ev ? toDatetimeLocalValue(ev.starts_at) : "");
  const [endsLocal, setEndsLocal] = useState(ev?.ends_at ? toDatetimeLocalValue(ev.ends_at) : "");
  const [location, setLocation] = useState(ev?.location ?? "");
  const [isMandatory, setIsMandatory] = useState(ev?.is_mandatory ?? true);
  const [notes, setNotes] = useState(ev?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !startsLocal) {
      alert("제목과 시작 일시는 필수입니다.");
      return;
    }
    const starts_at = new Date(startsLocal).toISOString();
    const ends_at_iso = endsLocal.trim() ? new Date(endsLocal).toISOString() : null;
    setSaving(true);
    try {
      if (modal.mode === "create") {
        const res = await fetch(`/api/team/events?teamCode=${encodeURIComponent(teamCode)}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            starts_at,
            ends_at: ends_at_iso,
            session_kind: sessionKind,
            seminar_subtype: sessionKind === "seminar" ? seminarSubtype : null,
            location: location.trim() || null,
            is_mandatory: isMandatory,
            notes: notes.trim() || null,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
        if (!res.ok) {
          alert(apiErrorUserHint(res.status, j));
          return;
        }
      } else {
        const res = await fetch(
          `/api/team/events/${encodeURIComponent(modal.event.id)}?teamCode=${encodeURIComponent(teamCode)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              starts_at,
              ends_at: ends_at_iso,
              session_kind: sessionKind,
              seminar_subtype: sessionKind === "seminar" ? seminarSubtype : null,
              location: location.trim() || null,
              is_mandatory: isMandatory,
              notes: notes.trim() || null,
            }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
        if (!res.ok) {
          alert(apiErrorUserHint(res.status, j));
          return;
        }
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop show"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{modal.mode === "create" ? "일정 추가" : "일정 수정"}</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="정기 훈련 / 룰 세미나 등"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">유형</label>
              <select
                className="form-control"
                value={sessionKind}
                onChange={(e) => setSessionKind(e.target.value === "seminar" ? "seminar" : "training")}
              >
                <option value="training">훈련</option>
                <option value="seminar">세미나</option>
              </select>
            </div>
            {sessionKind === "seminar" ? (
              <div className="form-group">
                <label className="form-label">세미나 종류</label>
                <select
                  className="form-control"
                  value={seminarSubtype}
                  onChange={(e) => setSeminarSubtype(e.target.value)}
                >
                  <option value="rule">룰 세미나</option>
                  <option value="video">비디오 세미나</option>
                  <option value="mixed">복합</option>
                  <option value="other">기타</option>
                </select>
              </div>
            ) : null}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">시작 일시 *</label>
              <input
                className="form-control"
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">종료 일시</label>
              <input
                className="form-control"
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">장소</label>
            <input
              className="form-control"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="구장 / 강의실"
            />
          </div>
          <div className="form-group">
            <label className="form-label">필수 참석</label>
            <select
              className="form-control"
              value={isMandatory ? "true" : "false"}
              onChange={(e) => setIsMandatory(e.target.value === "true")}
            >
              <option value="true">필수</option>
              <option value="false">선택</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea
              className="form-control"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="특이사항…"
            />
          </div>
        </div>
        <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
