/** API JSON 본문에서 읽는 최소 필드 */
export type ApiErrorBody = {
  error?: string;
  message?: string;
  teamCode?: string;
};

/**
 * 로스터·프로필·마이페이지 API 실패 시 사용자에게 보여 줄 한국어 안내.
 * `error` 코드와 HTTP status 를 함께 본다.
 */
export function apiErrorUserHint(status: number, body: ApiErrorBody | null | undefined): string {
  const code = body?.error;
  const serverMsg = typeof body?.message === "string" && body.message.trim() ? body.message.trim() : "";

  if (status === 401 || code === "unauthorized") {
    return "로그인이 필요합니다. /login 에서 데모 로그인했는지, 브라우저에 HttpOnly 쿠키 pp_demo_uid 가 설정됐는지 확인하세요.";
  }

  if (status === 503 && code === "schema_out_of_date") {
    return "DB 스키마가 앱보다 낮습니다. Supabase에 Prisma 마이그레이션을 적용한 뒤(npx prisma migrate deploy) 다시 시도하세요.";
  }

  if (status === 503 && code === "team_code_not_configured") {
    return "서버에 팀 코드가 없습니다. .env 의 NEXT_PUBLIC_PLAYPROVE_TEAM_CODE(예: seoul_dragons_fc)를 넣고 서버를 재시작하세요.";
  }

  if (status === 400 && code === "missing_team_code") {
    return "팀 코드가 요청에 없습니다. .env 의 NEXT_PUBLIC_PLAYPROVE_TEAM_CODE 또는 API 쿼리 teamCode= 를 확인하세요.";
  }

  if (status === 404 && code === "team_not_found") {
    const tc = body?.teamCode ? ` (요청 코드: ${body.teamCode})` : "";
    return `DB에서 팀을 찾지 못했습니다${tc}. teams.team_code 와 시드·환경 변수가 일치하는지, prisma db seed 를 실행했는지 확인하세요.`;
  }

  if (status === 404 && code === "no_team_membership") {
    return "이 계정의 팀 멤버십이 없습니다. 시드된 사용자로 로그인했는지, team_members 행이 있는지 확인하세요.";
  }

  if (status === 404 && code === "profile_not_found") {
    return "profiles 행이 없습니다. prisma db seed 로 프로필을 생성했는지 확인하세요.";
  }

  if (status === 400 && code === "use_player_flow") {
    return "이 API는 스태프 전용입니다. 선수 마이페이지는 다른 경로를 사용합니다.";
  }

  if (status === 400 && code === "invalid_json") {
    return "요청 본문이 올바른 JSON이 아닙니다.";
  }

  if (status === 400 && code === "no_fields") {
    return "수정할 필드가 없습니다.";
  }

  if (status >= 500) {
    const base = serverMsg || code || `HTTP ${status}`;
    return `서버 오류: ${base}. Supabase 연결·마이그레이션·Prisma 로그를 확인하세요.`;
  }

  if (serverMsg) return serverMsg;
  if (code) return `오류 코드: ${code} (HTTP ${status})`;
  return `요청 실패 (HTTP ${status})`;
}
