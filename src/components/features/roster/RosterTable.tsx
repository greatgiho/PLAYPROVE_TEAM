"use client";

import { RosterFace } from "@/components/roster/RosterFace";
import type { RosterTableRow } from "@/lib/types/rosterTable";

export function RosterTable({
  rows,
  showEdit,
  onEdit,
  onRowClick,
}: {
  rows: RosterTableRow[];
  showEdit?: boolean;
  onEdit?: (playerId: string) => void;
  onRowClick?: (row: RosterTableRow) => void;
}) {
  return (
    <div className="tbl-wrap">
      <table className="erp-table">
        <thead>
          <tr>
            <th style={{ width: 52 }} aria-label="사진" />
            <th>선수</th>
            <th>번호</th>
            <th>유닛</th>
            <th>포지션</th>
            <th>상태</th>
            {showEdit ? <th style={{ width: 100 }}>관리</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              style={onRowClick ? { cursor: "pointer" } : undefined}
              onClick={() => onRowClick?.(p)}
            >
              <td>
                <RosterFace name={p.full_name} photoUrl={p.roster_photo_url} size={36} />
              </td>
              <td>
                <div style={{ fontWeight: 800 }}>{p.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{p.phone ?? ""}</div>
              </td>
              <td>
                <span className="jersey-badge">{p.jersey_number ?? "-"}</span>
              </td>
              <td>{p.unit}</td>
              <td style={{ fontWeight: 800 }}>{p.primary_position}</td>
              <td>{p.player_status}</td>
              {showEdit && onEdit ? (
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p.id);
                    }}
                  >
                    수정
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
