"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { Player, PlayerStatus, UnitKind } from "@/lib/types/entities";
import { useCallback, useEffect, useState } from "react";

type Props = {
  isOpen: boolean;
  playerId: string | null;
  onClose: () => void;
  onSaved: () => void;
  /** DB 모드: teamCode 쿼리로 API 호출 */
  teamCode: string | null;
  /** 로컬 모드 */
  teamId: string | null;
  actorUserId: string;
};

const STATUS_OPTIONS: { value: PlayerStatus; label: string }[] = [
  { value: "active", label: "활성" },
  { value: "injured", label: "부상" },
  { value: "leave_absence", label: "휴학" },
  { value: "military_leave", label: "군휴학" },
];

export function PlayerEditModal({ isOpen, playerId, onClose, onSaved, teamCode, teamId, actorUserId }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    jersey_number: "" as string | number,
    join_year: "" as string | number,
    height_cm: "" as string | number,
    weight_kg: "" as string | number,
    unit: "offense" as UnitKind,
    primary_position: "",
    secondary_position: "",
    player_status: "active" as PlayerStatus,
    notes: "",
  });

  const useDb = Boolean(teamCode?.trim());

  const load = useCallback(async () => {
    if (!playerId) return;
    setErr(null);
    setLoading(true);
    try {
      if (useDb && teamCode) {
        const res = await fetch(
          `/api/roster/players/${encodeURIComponent(playerId)}?teamCode=${encodeURIComponent(teamCode)}`,
          { cache: "no-store", credentials: "include" },
        );
        const json = (await res.json().catch(() => null)) as (ApiErrorBody & { player?: Player }) | null;
        if (!res.ok) {
          throw new Error(apiErrorUserHint(res.status, json));
        }
        const data = json as { player: Player };
        const p = data.player;
        setForm({
          full_name: p.full_name,
          phone: p.phone ?? "",
          jersey_number: p.jersey_number ?? "",
          join_year: p.join_year ?? "",
          height_cm: p.height_cm ?? "",
          weight_kg: p.weight_kg ?? "",
          unit: p.unit,
          primary_position: p.primary_position,
          secondary_position: p.secondary_position ?? "",
          player_status: p.player_status,
          notes: p.notes ?? "",
        });
      } else if (teamId) {
        const svc = getTeamDataServices();
        const p = await svc.players.get(teamId, playerId);
        if (!p) throw new Error("PLAYER_NOT_FOUND");
        setForm({
          full_name: p.full_name,
          phone: p.phone ?? "",
          jersey_number: p.jersey_number ?? "",
          join_year: p.join_year ?? "",
          height_cm: p.height_cm ?? "",
          weight_kg: p.weight_kg ?? "",
          unit: p.unit,
          primary_position: p.primary_position,
          secondary_position: p.secondary_position ?? "",
          player_status: p.player_status,
          notes: p.notes ?? "",
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [playerId, teamCode, teamId, useDb]);

  useEffect(() => {
    if (isOpen && playerId) void load();
  }, [isOpen, playerId, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) return;
    setErr(null);
    setSaving(true);
    try {
      const jersey =
        form.jersey_number === "" || form.jersey_number === null || form.jersey_number === undefined
          ? null
          : Number(form.jersey_number);
      const joinYear =
        form.join_year === "" || form.join_year === null || form.join_year === undefined
          ? null
          : Number(form.join_year);
      const heightCm =
        form.height_cm === "" || form.height_cm === null || form.height_cm === undefined
          ? null
          : Number(form.height_cm);
      const weightKg =
        form.weight_kg === "" || form.weight_kg === null || form.weight_kg === undefined
          ? null
          : Number(form.weight_kg);

      if (useDb && teamCode) {
        const res = await fetch(
          `/api/roster/players/${encodeURIComponent(playerId)}?teamCode=${encodeURIComponent(teamCode)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: form.full_name.trim(),
              phone: form.phone.trim(),
              jersey_number: Number.isFinite(jersey) ? jersey : null,
              join_year: Number.isFinite(joinYear) ? joinYear : null,
              height_cm: Number.isFinite(heightCm) ? heightCm : null,
              weight_kg: Number.isFinite(weightKg) ? weightKg : null,
              unit: form.unit,
              primary_position: form.primary_position.trim(),
              secondary_position: form.secondary_position.trim() || null,
              player_status: form.player_status,
              notes: form.notes.trim() || null,
            }),
          },
        );
        const saveJson = (await res.json().catch(() => null)) as ApiErrorBody | null;
        if (!res.ok) {
          throw new Error(apiErrorUserHint(res.status, saveJson));
        }
      } else if (teamId) {
        const svc = getTeamDataServices();
        await svc.players.update(
          teamId,
          playerId,
          {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            jersey_number: Number.isFinite(jersey) ? jersey : null,
            join_year: Number.isFinite(joinYear) ? joinYear : null,
            height_cm: Number.isFinite(heightCm) ? heightCm : null,
            weight_kg: Number.isFinite(weightKg) ? weightKg : null,
            unit: form.unit,
            primary_position: form.primary_position.trim(),
            secondary_position: form.secondary_position.trim() || null,
            player_status: form.player_status,
            notes: form.notes.trim() || null,
          },
          actorUserId,
        );
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !playerId) return null;

  return (
    <div
      className="modal-backdrop show"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="playerEditTitle" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" id="playerEditTitle">
            선수 정보 수정
          </div>
          <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p style={{ margin: 0, color: "var(--gray-600)" }}>불러오는 중…</p>
          ) : (
            <form id="playerEditForm" onSubmit={(e) => void submit(e)}>
              {err ? (
                <div style={{ color: "var(--danger, #b42318)", marginBottom: 12, fontSize: 13 }}>{err}</div>
              ) : null}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">이름 *</label>
                  <input
                    className="form-control"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">연락처 *</label>
                  <input
                    className="form-control"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                  />
                  {useDb ? (
                    <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>
                      Auth에 연결된 프로필이 있을 때만 DB에 저장됩니다.
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">등번호</label>
                  <input
                    className="form-control"
                    type="number"
                    min={0}
                    max={99}
                    value={form.jersey_number}
                    onChange={(e) => setForm((f) => ({ ...f, jersey_number: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">입단연도</label>
                  <input
                    className="form-control"
                    type="number"
                    min={2000}
                    max={2035}
                    value={form.join_year}
                    onChange={(e) => setForm((f) => ({ ...f, join_year: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">신장 (cm)</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.1"
                    value={form.height_cm}
                    onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">체중 (kg)</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.1"
                    value={form.weight_kg}
                    onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">유닛 *</label>
                  <select
                    className="form-control"
                    required
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as UnitKind }))}
                  >
                    <option value="offense">Offense</option>
                    <option value="defense">Defense</option>
                    <option value="special">Special</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">주포지션 *</label>
                  <input
                    className="form-control"
                    required
                    value={form.primary_position}
                    onChange={(e) => setForm((f) => ({ ...f, primary_position: e.target.value }))}
                    placeholder="QB, WR, DE …"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">부포지션</label>
                  <input
                    className="form-control"
                    value={form.secondary_position}
                    onChange={(e) => setForm((f) => ({ ...f, secondary_position: e.target.value }))}
                    placeholder="없으면 비움"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">상태</label>
                  <select
                    className="form-control"
                    value={form.player_status}
                    onChange={(e) => setForm((f) => ({ ...f, player_status: e.target.value as PlayerStatus }))}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">메모</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className="fas fa-save"></i> {saving ? "저장 중…" : "수정 저장"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
