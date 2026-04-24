"use client";

import type { ProfileAvatarPayload } from "@/components/mypage/ProfileAvatarSlots";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { useSession, useAllowableViewModes } from "@/lib/context/SessionContext";
import { getPlayproveTeamCode } from "@/lib/config";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { MypageStaffContext } from "@/lib/types/mypageStaffContext";
import type { AttendanceRecord, InjuryReport, MonthlyDue, Player, TeamEvent } from "@/lib/types/entities";
import { useCallback, useEffect, useState } from "react";
import { isStaffTeamRole } from "./mypageUtils";

const teamCode = getPlayproveTeamCode();

export function useMypagePageState() {
  const { session, setViewMode } = useSession();
  const allowable = useAllowableViewModes();

  const [loading, setLoading] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<ProfileAvatarPayload | null>(null);
  const [profileFetchState, setProfileFetchState] = useState<"idle" | "loading" | "ok" | "missing" | "error">("idle");
  const [profileErrorHint, setProfileErrorHint] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dues, setDues] = useState<MonthlyDue[]>([]);
  const [injuries, setInjuries] = useState<InjuryReport[]>([]);

  const [staffContext, setStaffContext] = useState<MypageStaffContext | null>(null);
  const [staffState, setStaffState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffReloadToken, setStaffReloadToken] = useState(0);

  const showPlayerDash = session?.teamRole === "player" && Boolean(session.playerId);
  const showStaffDash = session && isStaffTeamRole(session.teamRole);

  const loadPlayer = useCallback(async () => {
    if (!session?.teamId || !session.playerId) {
      setPlayer(null);
      setEvents([]);
      setAttendance([]);
      setDues([]);
      setInjuries([]);
      return;
    }
    setLoading(true);
    try {
      const svc = getTeamDataServices();
      const [p, ev, att, du, inj] = await Promise.all([
        svc.players.get(session.teamId, session.playerId),
        svc.events.listByTeam(session.teamId),
        svc.attendance.listByTeam(session.teamId),
        svc.dues.listByTeam(session.teamId),
        svc.injuries.listByTeam(session.teamId),
      ]);
      setPlayer(p);
      setEvents(ev);
      setAttendance(att);
      setDues(du);
      setInjuries(inj);
    } finally {
      setLoading(false);
    }
  }, [session?.teamId, session?.playerId]);

  useEffect(() => {
    if (!showPlayerDash) {
      setPlayer(null);
      setEvents([]);
      setAttendance([]);
      setDues([]);
      setInjuries([]);
      return;
    }
    void loadPlayer();
  }, [loadPlayer, showPlayerDash]);

  useEffect(() => {
    if (!showStaffDash || !teamCode) {
      setStaffContext(null);
      setStaffState("idle");
      setStaffError(null);
      return;
    }
    let cancelled = false;
    setStaffState("loading");
    setStaffError(null);
    void (async () => {
      const res = await fetch("/api/mypage/context", { cache: "no-store", credentials: "include" });
      if (cancelled) return;
      const j = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setStaffContext(null);
        setStaffState("error");
        setStaffError(apiErrorUserHint(res.status, j as ApiErrorBody));
        return;
      }
      setStaffContext(j as MypageStaffContext);
      setStaffState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [showStaffDash, session?.userId, staffReloadToken]);

  useEffect(() => {
    if (!teamCode || !session?.userId) {
      setProfilePhotos(null);
      setProfileFetchState("idle");
      return;
    }
    let cancelled = false;
    setProfileFetchState("loading");
    void (async () => {
      setProfileErrorHint(null);
      const res = await fetch(`/api/profile/${session.userId}`, { cache: "no-store", credentials: "include" });
      if (cancelled) return;
      if (res.status === 404) {
        setProfileFetchState("missing");
        setProfilePhotos(null);
        return;
      }
      const j = (await res.json().catch(() => null)) as ProfileAvatarPayload | ApiErrorBody | null;
      if (!res.ok) {
        setProfileFetchState("error");
        setProfileErrorHint(apiErrorUserHint(res.status, j as ApiErrorBody));
        setProfilePhotos(null);
        return;
      }
      setProfileFetchState("ok");
      setProfilePhotos({
        avatarUrl: (j as ProfileAvatarPayload).avatarUrl ?? null,
        personalAvatarUrl: (j as ProfileAvatarPayload).personalAvatarUrl ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  return {
    session,
    setViewMode,
    allowable,
    teamCode,
    loading,
    profilePhotos,
    setProfilePhotos,
    profileFetchState,
    profileErrorHint,
    player,
    events,
    attendance,
    dues,
    injuries,
    staffContext,
    staffState,
    staffError,
    setStaffReloadToken,
    showPlayerDash,
    showStaffDash,
  };
}
