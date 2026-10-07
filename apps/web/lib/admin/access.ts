import type { AdminRole } from "./auth";
const rank: Record<AdminRole, number> = { support: 1, analyst: 2, admin: 3, owner: 4 };
export type Membership = { role: AdminRole; isActive: boolean };
export function isActiveAdmin(membership: Membership | null): membership is Membership { return Boolean(membership?.isActive); }
export function canManageAdminRole(actor: AdminRole, desired: AdminRole): boolean { return actor === "owner" || (actor === "admin" && rank[desired] < rank.admin); }
export function canSuspendAccount(actor: AdminRole, target: Membership | null): boolean { return rank[actor] >= rank.admin && !(target?.role === "owner" && target.isActive); }
