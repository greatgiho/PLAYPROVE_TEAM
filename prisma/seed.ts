import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
  PrismaClient,
  Prisma,
  player_roster_status,
  team_member_role,
  team_member_status,
} from "@prisma/client";

const prisma = new PrismaClient();

const TEAM_CODE = "seoul_dragons_fc";
const TEAM_NAME = "서울 드래곤즈 (Seoul Dragons)";
const SEED_NAMESPACE = "playprove-bulk-2026";

/** 재실행 시에도 동일 UUID (Auth id = Profile id) */
function deterministicUuid(key: string): string {
  const hash = createHash("sha256").update(`${SEED_NAMESPACE}\0${key}`).digest();
  const buf = Buffer.alloc(16);
  hash.copy(buf, 0, 0, 16);
  buf[6] = (buf[6]! & 0x0f) | 0x40;
  buf[8] = (buf[8]! & 0x3f) | 0x80;
  const h = buf.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAM = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "배", "홍"];
const MID = ["민", "서", "도", "하", "재", "유", "태", "승", "우", "빈", "율", "희", "린", "빛", "준", "연", "호", "원", "경", "수"];
const END = ["준", "연", "호", "원", "율", "빈", "성", "린", "아", "은", "진", "현", "우", "빛", "담", "솔", "해", "겸", "윤", "찬"];

function koreanName(rand: () => number, used: Set<string>): string {
  for (let n = 0; n < 80; n++) {
    const name = FAM[Math.floor(rand() * FAM.length)]! + MID[Math.floor(rand() * MID.length)]! + END[Math.floor(rand() * END.length)]!;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  return `선수${Math.floor(rand() * 1e6)}`;
}

type SeedRole = "MANAGER" | "COACH" | "PLAYER";

function metaBase(role: SeedRole, extra: Record<string, unknown> = {}): Prisma.InputJsonValue {
  return { seed_role: role, ...extra };
}

function resolveSupabaseProjectUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "시드: NEXT_PUBLIC_SUPABASE_URL 이 비어 있습니다. Settings → API 의 Project URL(https://<ref>.supabase.co)을 넣으세요.",
    );
  }
  let url = raw.replace(/^["']|["']$/g, "").trim();
  if (/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error("시드: NEXT_PUBLIC_SUPABASE_URL 에 postgresql:// DATABASE_URL 을 넣지 마세요.");
  }
  if (!/^https?:\/\//i.test(url)) {
    const m = /^([a-z0-9-]+)\.supabase\.co$/i.exec(url.replace(/\/$/, ""));
    if (m) url = `https://${m[1]}.supabase.co`;
    else throw new Error("시드: NEXT_PUBLIC_SUPABASE_URL 은 https:// 로 시작해야 합니다.");
  }
  const u = new URL(url);
  const host = u.hostname.toLowerCase();
  if (!host.endsWith(".supabase.co") && !host.endsWith(".supabase.com")) {
    throw new Error("시드: Supabase Project URL 호스트가 올바르지 않습니다.");
  }
  return url;
}

async function ensureAuthUser(id: string, email: string, displayName: string, userMeta: Record<string, unknown>): Promise<void> {
  const url = resolveSupabaseProjectUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    throw new Error("시드: SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const password = process.env.SEED_AUTH_PASSWORD ?? "PlayproveSeed!ChangeMe";
  const { data, error } = await admin.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, ...userMeta },
  });
  if (data.user?.id) return;
  const msg = (error?.message ?? "").toLowerCase();
  if (
    msg.includes("already") ||
    msg.includes("registered") ||
    msg.includes("duplicate") ||
    msg.includes("exists") ||
    msg.includes("unique")
  ) {
    return;
  }
  if (error) throw error;
}

async function upsertProfile(id: string, displayName: string, metadata: Prisma.InputJsonValue) {
  await prisma.profile.upsert({
    where: { id },
    create: { id, displayName, metadata },
    update: { displayName, metadata, deletedAt: null },
  });
}

/** 데모 매니저·코치 — `core.profiles` 스태프 확장 컬럼 (마이그레이션 적용 후 동작) */
async function applyDemoStaffProfileColumns(
  managerUsers: { id: string }[],
  coachUsers: { id: string; title: string }[],
) {
  const mgr0 = managerUsers[0]?.id;
  const headId = coachUsers[0]?.id;
  const partId = coachUsers[1]?.id;
  if (!mgr0 || !headId || !partId) return;

  const rows: { id: string; data: Prisma.ProfileUpdateInput }[] = [
    {
      id: mgr0,
      data: {
        academicMajor: "스포츠 매니지먼트 (석사 과정)",
        staffResponsibilities: [
          "K리그·아마추어 리그 회비 정산 및 영수증 보관",
          "신규 선수 가입 서류·보험 가입 확인",
          "홈경기 스태프 배정·봉사 시간 기록",
        ].join("\n"),
        coachingCareerNotes: null,
        coachingUnit: null,
      },
    },
    {
      id: headId,
      data: {
        academicMajor: "운동생리학",
        staffResponsibilities: ["헤드 코치 주간 보고서 작성", "전술 패키지 버전 관리"].join("\n"),
        coachingCareerNotes: ["2018–2022: 대학팀 오펜스 코디네이터", "2023–현재: 서울 드래곤즈 헤드코치"].join("\n"),
        coachingUnit: "team",
      },
    },
    {
      id: partId,
      data: {
        academicMajor: null,
        staffResponsibilities: ["오펜스 포지션 미팅 주 2회", "패스 프로텍션 드릴 설계"].join("\n"),
        coachingCareerNotes: ["2019–2021: D2 WR 코치", "2022–현재: 오펜스 코디네이터"].join("\n"),
        coachingUnit: "offense",
      },
    },
  ];

  for (const { id, data } of rows) {
    try {
      await prisma.profile.update({ where: { id }, data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unknown arg") || msg.includes("does not exist")) {
        console.warn(
          "[seed] profiles 스태프 컬럼이 없습니다. `npx prisma migrate deploy` 또는 `db push` 후 시드를 다시 실행하세요.",
        );
        return;
      }
      throw e;
    }
  }
}

async function upsertTeamMember(
  teamId: string,
  userId: string,
  role: team_member_role,
  playerId: string | null,
  metadata: Prisma.InputJsonValue,
) {
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: {
      teamId,
      userId,
      role,
      status: team_member_status.active,
      playerId,
      joinedAt: new Date(),
      metadata,
    },
    update: {
      role,
      status: team_member_status.active,
      playerId,
      joinedAt: new Date(),
      deletedAt: null,
      metadata,
    },
  });
}

/** 코칭스태프 8명 (DB enum: head_coach 1 + part_coach 7, 직함은 metadata) */
const COACH_ROSTER: { title: string; role: team_member_role }[] = [
  { title: "헤드코치", role: team_member_role.head_coach },
  { title: "오펜스 코디네이터", role: team_member_role.part_coach },
  { title: "디펜스 코디네이터", role: team_member_role.part_coach },
  { title: "스페셜팀 코치", role: team_member_role.part_coach },
  { title: "올라인(라인맨) 코치", role: team_member_role.part_coach },
  { title: "백필드 코치", role: team_member_role.part_coach },
  { title: "리시버 코치", role: team_member_role.part_coach },
  { title: "디라인 / 라인배커 / DB 코치", role: team_member_role.part_coach },
];

const MANAGER_TITLES = ["마케팅 매니저", "인사 매니저", "경기 데이터 매니저"] as const;

/** 공격·수비 주요 포지션 22종 × 2명 = 44 */
const PRIMARY_POSITIONS_22 = [
  "QB",
  "RB",
  "FB",
  "WR",
  "TE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "DE",
  "DT",
  "NT",
  "OLB",
  "ILB",
  "CB",
  "FS",
  "SS",
  "EDGE",
  "NB",
  "SAM",
  "WILL",
] as const;

function unitForPosition(pos: string): string | null {
  if (["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"].includes(pos)) return "offense";
  if (["DE", "DT", "NT", "OLB", "ILB", "CB", "FS", "SS", "EDGE", "NB", "SAM", "WILL"].includes(pos)) return "defense";
  return null;
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

async function main() {
  const rand = mulberry32(20260423);
  const usedNames = new Set<string>();
  const delayMs = Number(process.env.SEED_AUTH_DELAY_MS ?? 60);

  const seasonYear = new Date().getFullYear();

  const managerUsers: { id: string; email: string; name: string; title: string }[] = [];
  for (let i = 0; i < MANAGER_TITLES.length; i++) {
    const key = `mgr-${i}`;
    const id = deterministicUuid(key);
    const email = `bulk.${key}@seed.playprove.local`;
    const name = i === 0 ? "김주성" : koreanName(rand, usedNames);
    if (i === 0) usedNames.add("김주성");
    managerUsers.push({ id, email, name, title: MANAGER_TITLES[i]! });
  }

  const coachUsers: { id: string; email: string; name: string; title: string; role: team_member_role }[] = [];
  for (let i = 0; i < COACH_ROSTER.length; i++) {
    const key = `coach-${i}`;
    const id = deterministicUuid(key);
    const email = `bulk.${key}@seed.playprove.local`;
    const name = koreanName(rand, usedNames);
    const { title, role } = COACH_ROSTER[i]!;
    coachUsers.push({ id, email, name, title, role });
  }

  const playerUsers: { id: string; email: string; name: string; idx: number }[] = [];
  for (let i = 0; i < 44; i++) {
    const key = `player-${i}`;
    const id = deterministicUuid(key);
    const email = `bulk.${key}@seed.playprove.local`;
    const name = koreanName(rand, usedNames);
    playerUsers.push({ id, email, name, idx: i });
  }

  const ownerId = managerUsers[0]!.id;

  for (const u of [...managerUsers, ...coachUsers, ...playerUsers]) {
    await ensureAuthUser(u.id, u.email, u.name, { seed_kind: "bulk_roster" });
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  const team = await prisma.team.upsert({
    where: { teamCode: TEAM_CODE },
    create: {
      name: TEAM_NAME,
      teamCode: TEAM_CODE,
      seasonYear,
      city: "서울",
      ownerUserId: ownerId,
      metadata: { seed: "bulk_v1" } as Prisma.InputJsonValue,
    },
    update: {
      name: TEAM_NAME,
      seasonYear,
      city: "서울",
      ownerUserId: ownerId,
      deletedAt: null,
      metadata: { seed: "bulk_v1" } as Prisma.InputJsonValue,
    },
  });

  for (const m of managerUsers) {
    await upsertProfile(m.id, m.name, metaBase("MANAGER", { seed_title: m.title }));
    await upsertTeamMember(team.id, m.id, team_member_role.manager, null, metaBase("MANAGER", { seed_title: m.title }));
  }

  for (const c of coachUsers) {
    await upsertProfile(c.id, c.name, metaBase("COACH", { seed_title: c.title }));
    await upsertTeamMember(team.id, c.id, c.role, null, metaBase("COACH", { seed_title: c.title }));
  }

  const rosterSlots = [...PRIMARY_POSITIONS_22, ...PRIMARY_POSITIONS_22];
  shuffleInPlace(rosterSlots, rand);

  const jerseys = Array.from({ length: 99 }, (_, i) => i + 1);
  shuffleInPlace(jerseys, rand);
  const jerseyPick = jerseys.slice(0, 44);

  const playerRows: { id: string; userId: string }[] = [];
  /** Next.js 데모 세션 `SessionContext` 의 선수 playerId 와 동일해야 로스터/마이페이지가 맞습니다. */
  const DEMO_FIXED_PLAYER_ROW_ID = "00000000-0000-4000-8000-000000000007";

  for (let i = 0; i < playerUsers.length; i++) {
    const pu = playerUsers[i]!;
    const pos = rosterSlots[i]!;
    const heightCm = new Prisma.Decimal((170 + rand() * 25).toFixed(1));
    const weightKg = new Prisma.Decimal((70 + rand() * 50).toFixed(1));

    await upsertProfile(pu.id, pu.name, metaBase("PLAYER", { primary_position: pos }));

    let playerId: string;

    if (i === 0) {
      const p = await prisma.player.upsert({
        where: { id: DEMO_FIXED_PLAYER_ROW_ID },
        create: {
          id: DEMO_FIXED_PLAYER_ROW_ID,
          teamId: team.id,
          linkedUserId: pu.id,
          fullName: pu.name,
          primaryPosition: pos,
          secondaryPosition: null,
          unit: unitForPosition(pos),
          jerseyNumber: jerseyPick[i]!,
          heightCm,
          weightKg,
          joinYear: seasonYear,
          rosterStatus: player_roster_status.active,
          metadata: { seed: "bulk_v1", idx: i, demo_fixed: true } as Prisma.InputJsonValue,
        },
        update: {
          linkedUserId: pu.id,
          fullName: pu.name,
          primaryPosition: pos,
          secondaryPosition: null,
          unit: unitForPosition(pos),
          jerseyNumber: jerseyPick[i]!,
          heightCm,
          weightKg,
          joinYear: seasonYear,
          rosterStatus: player_roster_status.active,
          deletedAt: null,
          metadata: { seed: "bulk_v1", idx: i, demo_fixed: true } as Prisma.InputJsonValue,
        },
      });
      playerId = p.id;
    } else {
      const existing = await prisma.player.findFirst({
        where: { teamId: team.id, linkedUserId: pu.id, deletedAt: null },
        select: { id: true },
      });

      if (existing) {
        const p = await prisma.player.update({
          where: { id: existing.id },
          data: {
            fullName: pu.name,
            primaryPosition: pos,
            secondaryPosition: null,
            unit: unitForPosition(pos),
            jerseyNumber: jerseyPick[i]!,
            heightCm,
            weightKg,
            joinYear: seasonYear,
            rosterStatus: player_roster_status.active,
            linkedUserId: pu.id,
            deletedAt: null,
            metadata: { seed: "bulk_v1", idx: i } as Prisma.InputJsonValue,
          },
        });
        playerId = p.id;
      } else {
        const p = await prisma.player.create({
          data: {
            teamId: team.id,
            linkedUserId: pu.id,
            fullName: pu.name,
            primaryPosition: pos,
            unit: unitForPosition(pos),
            jerseyNumber: jerseyPick[i]!,
            heightCm,
            weightKg,
            joinYear: seasonYear,
            rosterStatus: player_roster_status.active,
            metadata: { seed: "bulk_v1", idx: i } as Prisma.InputJsonValue,
          },
        });
        playerId = p.id;
      }
    }

    playerRows.push({ id: playerId, userId: pu.id });
    await upsertTeamMember(team.id, pu.id, team_member_role.player, playerId, metaBase("PLAYER", { primary_position: pos }));
  }

  const duties = ["K", "P", "H", "LS"] as const;
  const dutyMap = new Map<string, Set<string>>();
  for (const duty of duties) {
    const pick = playerRows[Math.floor(rand() * playerRows.length)]!;
    if (!dutyMap.has(pick.id)) dutyMap.set(pick.id, new Set());
    dutyMap.get(pick.id)!.add(duty);
  }

  for (const [playerId, set] of dutyMap) {
    const cur = await prisma.player.findUnique({ where: { id: playerId }, select: { metadata: true } });
    const base = (cur?.metadata && typeof cur.metadata === "object" && !Array.isArray(cur.metadata) ? cur.metadata : {}) as Record<
      string,
      unknown
    >;
    await prisma.player.update({
      where: { id: playerId },
      data: {
        metadata: {
          ...base,
          special_teams_duties: [...set],
        } as Prisma.InputJsonValue,
      },
    });
  }

  await applyDemoStaffProfileColumns(managerUsers, coachUsers);

  console.log("Seed 완료:", {
    team: team.name,
    teamId: team.id,
    managers: managerUsers.length,
    coaches: coachUsers.length,
    players: playerUsers.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
