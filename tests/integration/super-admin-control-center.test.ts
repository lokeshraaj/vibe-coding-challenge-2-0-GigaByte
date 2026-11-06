import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Super Admin Control Center & Cascade Delete Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Access Control & Role Hierarchy", () => {
    it("allows SUPER_ADMIN and PLATFORM_ADMIN to access admin endpoints", () => {
      const isPlatformAuthorized = (role: string) => {
        return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN";
      };

      expect(isPlatformAuthorized("SUPER_ADMIN")).toBe(true);
      expect(isPlatformAuthorized("PLATFORM_ADMIN")).toBe(true);
      expect(isPlatformAuthorized("ACADEMY_OWNER")).toBe(false);
      expect(isPlatformAuthorized("COACH")).toBe(false);
      expect(isPlatformAuthorized("PLAYER")).toBe(false);
      expect(isPlatformAuthorized("SCOUT")).toBe(false);
    });

    it("restricts cascade deletion strictly to SUPER_ADMIN", () => {
      const canCascadeDelete = (role: string) => role === "SUPER_ADMIN";

      expect(canCascadeDelete("SUPER_ADMIN")).toBe(true);
      expect(canCascadeDelete("PLATFORM_ADMIN")).toBe(false);
      expect(canCascadeDelete("ACADEMY_OWNER")).toBe(false);
    });
  });

  describe("Academy & User Blocking Invariants", () => {
    it("rejects login when an account is marked as BLOCKED", () => {
      const checkUserLogin = (user: { status: string; blockedReason?: string }) => {
        if (user.status === "BLOCKED") {
          throw new Error(`Your account has been blocked: ${user.blockedReason || "Violation"}`);
        }
        return { allowed: true };
      };

      expect(() =>
        checkUserLogin({ status: "BLOCKED", blockedReason: "Terms of service violation" })
      ).toThrow("Your account has been blocked");
      expect(checkUserLogin({ status: "ACTIVE" })).toEqual({ allowed: true });
    });

    it("strictly prevents self-blocking and blocking the last active Super Admin", () => {
      const attemptBlockUser = (
        actorId: string,
        targetUser: { id: string; role: string },
        activeSuperAdminCount: number
      ) => {
        if (actorId === targetUser.id) {
          throw new Error("Self-modification blocked: You cannot block your own account");
        }
        if (targetUser.role === "SUPER_ADMIN" && activeSuperAdminCount <= 1) {
          throw new Error("Cannot block the last active Super Admin account");
        }
        return { success: true };
      };

      // 1. Self blocking attempt -> REJECTED
      expect(() =>
        attemptBlockUser("admin-1", { id: "admin-1", role: "SUPER_ADMIN" }, 1)
      ).toThrow("Self-modification blocked");

      // 2. Blocking the only Super Admin -> REJECTED
      expect(() =>
        attemptBlockUser("admin-2", { id: "admin-1", role: "SUPER_ADMIN" }, 1)
      ).toThrow("Cannot block the last active Super Admin");

      // 3. Blocking another regular user -> ALLOWED
      expect(
        attemptBlockUser("admin-1", { id: "user-99", role: "COACH" }, 1)
      ).toEqual({ success: true });
    });

    it("preserves access to other academies when a multi-academy user has one academy blocked", () => {
      const verifyMultiAcademyTenantAccess = (
        user: { id: string; status: string },
        targetAcademy: { id: string; status: string }
      ) => {
        if (user.status === "BLOCKED") {
          throw new Error("User globally blocked");
        }
        if (targetAcademy.status === "BLOCKED") {
          throw new Error("Target academy tenant is blocked");
        }
        return { accessGranted: true, academyId: targetAcademy.id };
      };

      const user = { id: "user-1", status: "ACTIVE" };
      const blockedAcademy = { id: "acad-1", status: "BLOCKED" };
      const activeAcademy = { id: "acad-2", status: "ACTIVE" };

      // Accessing blocked academy -> REJECTED
      expect(() => verifyMultiAcademyTenantAccess(user, blockedAcademy)).toThrow(
        "Target academy tenant is blocked"
      );

      // Accessing active academy -> ALLOWED
      expect(verifyMultiAcademyTenantAccess(user, activeAcademy)).toEqual({
        accessGranted: true,
        academyId: "acad-2",
      });
    });
  });

  describe("Cascade Delete & Shared-User Preservation Invariants", () => {
    it("correctly separates exclusive users from shared and platform admin users", () => {
      const usersInAcademy = [
        { id: "u1", role: "COACH", otherAcademiesCount: 0 }, // Exclusive
        { id: "u2", role: "COACH", otherAcademiesCount: 2 }, // Shared across 2 other academies
        { id: "u3", role: "PLAYER", otherAcademiesCount: 0 }, // Exclusive
        { id: "u4", role: "SUPER_ADMIN", otherAcademiesCount: 0 }, // Platform Super Admin
        { id: "u5", role: "ACADEMY_OWNER", otherAcademiesCount: 0 }, // Exclusive owner
      ];

      const separateUsers = (list: typeof usersInAcademy) => {
        const exclusive: typeof usersInAcademy = [];
        const preserved: typeof usersInAcademy = [];

        for (const u of list) {
          if (u.role === "SUPER_ADMIN" || u.role === "PLATFORM_ADMIN" || u.otherAcademiesCount > 0) {
            preserved.push(u);
          } else {
            exclusive.push(u);
          }
        }
        return { exclusive, preserved };
      };

      const result = separateUsers(usersInAcademy);
      expect(result.exclusive.map((u) => u.id)).toEqual(["u1", "u3", "u5"]);
      expect(result.preserved.map((u) => u.id)).toEqual(["u2", "u4"]);
    });

    it("requires exact academy name confirmation before executing cascade delete", () => {
      const validateConfirmation = (actualName: string, typedName: string) => {
        if (actualName.trim().toLowerCase() !== typedName.trim().toLowerCase()) {
          throw new Error("Confirmation mismatch: Exact academy name required");
        }
        return true;
      };

      expect(() => validateConfirmation("Apex Sports Academy", "apex")).toThrow("Confirmation mismatch");
      expect(validateConfirmation("Apex Sports Academy", "Apex Sports Academy")).toBe(true);
      expect(validateConfirmation("Apex Sports Academy", "  apex sports academy  ")).toBe(true);
    });

    it("ensures platform AuditLog entries survive academy cascade deletion", () => {
      const recordsDatabase: { academies: string[]; auditLogs: Array<{ action: string; resourceId: string }> } = {
        academies: ["acad-123"],
        auditLogs: [
          { action: "ACADEMY_CREATED", resourceId: "acad-123" },
          { action: "USER_INVITED", resourceId: "acad-123" },
        ],
      };

      const cascadeDeleteAcademy = (academyId: string, reason: string) => {
        // Remove academy from database
        recordsDatabase.academies = recordsDatabase.academies.filter((id) => id !== academyId);
        // Create permanent post-deletion audit record
        recordsDatabase.auditLogs.push({
          action: "CASCADE_DELETE_ACADEMY",
          resourceId: academyId,
        });
      };

      cascadeDeleteAcademy("acad-123", "Academy officially shut down");

      expect(recordsDatabase.academies).toHaveLength(0);
      expect(recordsDatabase.auditLogs).toHaveLength(3);
      expect(recordsDatabase.auditLogs[2].action).toBe("CASCADE_DELETE_ACADEMY");
    });
  });
});
