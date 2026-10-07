import { describe, expect, it } from "vitest";
import { canManageAdminRole, canSuspendAccount, isActiveAdmin } from "./access";

describe("admin access decisions", () => {
  it("never treats inactive memberships as administration access", () => {
    expect(isActiveAdmin({ role: "owner", isActive: false })).toBe(false);
    expect(isActiveAdmin({ role: "analyst", isActive: true })).toBe(true);
  });

  it("reserves owner-level administration for owners", () => {
    expect(canManageAdminRole("admin", "owner")).toBe(false);
    expect(canManageAdminRole("owner", "owner")).toBe(true);
  });

  it("does not permit an active owner to be suspended", () => {
    expect(canSuspendAccount("admin", { role: "owner", isActive: true })).toBe(false);
    expect(canSuspendAccount("owner", null)).toBe(true);
  });
});
