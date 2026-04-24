"use client";

import { AttendanceDbPanel } from "./AttendanceDbPanel";
import { AttendanceLocalPanel } from "./AttendanceLocalPanel";
import { useAttendancePageState } from "./useAttendancePageState";

export function AttendancePageView() {
  const s = useAttendancePageState();

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-calendar-check"></i> 출결 관리
        </div>
        {s.useDb && s.isManager ? (
          <button type="button" className="btn btn-primary" onClick={() => s.setScheduleModal({ mode: "create" })}>
            <i className="fas fa-plus"></i> 일정 추가
          </button>
        ) : null}
      </div>

      {s.useDb && s.dbErr ? (
        <div style={{ color: "var(--danger, #b42318)", marginBottom: 12, fontSize: 13 }}>{s.dbErr}</div>
      ) : null}

      {s.isPlayerView ? (
        <div
          style={{
            background: "var(--blue-bg)",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: "#1e40af",
          }}
        >
          <i className="fas fa-info-circle"></i> <strong>본인 출결만 변경</strong>할 수 있습니다. 타인 출결은 읽기
          전용입니다.
        </div>
      ) : null}

      {s.useDb && s.dbLoading && !s.dbEvents.length ? (
        <p style={{ color: "var(--gray-600)" }}>불러오는 중…</p>
      ) : null}

      {s.useDb ? (
        <AttendanceDbPanel
          teamCode={s.teamCode}
          dbEvents={s.dbEvents}
          setActiveEventId={s.setActiveEventId}
          activeDbEvent={s.activeDbEvent}
          visibleDbRows={s.visibleDbRows}
          dbStats={s.dbStats}
          isManager={s.isManager}
          isPlayerView={s.isPlayerView}
          myPlayerId={s.myPlayerId}
          setDbRows={s.setDbRows}
          loadDb={s.loadDb}
          refreshDbEventCounts={s.refreshDbEventCounts}
          scheduleModal={s.scheduleModal}
          setScheduleModal={s.setScheduleModal}
        />
      ) : (
        <AttendanceLocalPanel
          events={s.events}
          activeEvent={s.activeEvent}
          setActiveEventId={s.setActiveEventId}
          players={s.players}
          map={s.map}
          isPlayerView={s.isPlayerView}
          myPlayerId={s.myPlayerId}
          setAtt={s.setAtt}
        />
      )}
    </div>
  );
}
