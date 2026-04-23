import type { EntityBase } from "@/lib/types/entities";

export type ActorId = string | null;

function nowIso() {
  return new Date().toISOString();
}

export function createBaseEntity(actorId: ActorId): EntityBase {
  const t = nowIso();
  return {
    id: crypto.randomUUID(),
    created_at: t,
    updated_at: t,
    deleted_at: null,
    created_by: actorId,
    updated_by: actorId,
  };
}

export function touchEntity<T extends EntityBase>(row: T, actorId: ActorId): T {
  return {
    ...row,
    updated_at: nowIso(),
    updated_by: actorId,
  };
}

export function softDeleteEntity<T extends EntityBase>(row: T, actorId: ActorId): T {
  return {
    ...row,
    deleted_at: nowIso(),
    updated_at: nowIso(),
    updated_by: actorId,
  };
}
