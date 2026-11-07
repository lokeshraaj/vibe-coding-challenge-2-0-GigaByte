import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticateWithGoogle } from "@/modules/authentication/google-auth-service";
import { verifySessionToken } from "@/lib/auth/jwt";
import * as firebaseAdmin from "@/lib/firebase/admin";
import * as dbModule from "@/lib/db/mongodb";
import { User, Coach, Player, Academy } from "@/models";
import mongoose from "mongoose";

// Mock dependencies
vi.mock("@/lib/firebase/admin", () => ({
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models", () => ({
  User: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(true),
    }),
  },
  Coach: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
  Scout: {
    findOne: vi.fn(),
  },
  Player: {
    findOne: vi.fn(),
  },
  Academy: {
    findById: vi.fn(),
  },
}));

describe("ATHLIX Google Sign-In with Firebase Authentication Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockObjectId = (hex: string = "507f191e810c19729de860ea") =>
    new mongoose.Types.ObjectId(hex);

  describe("1. Token Verification & Security Guardrails", () => {
    it("rejects when token is empty or whitespace", async () => {
      await expect(authenticateWithGoogle("")).rejects.toThrow("Firebase ID token is required");
      await expect(authenticateWithGoogle("   ")).rejects.toThrow("Firebase ID token is required");
    });

    it("rejects when Firebase token is expired, forged, or revoked", async () => {
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockRejectedValueOnce(
        new Error("Firebase ID token has expired.")
      );

      await expect(authenticateWithGoogle("expired-token")).rejects.toThrow(
        /Invalid, expired, or revoked Google authentication token/i
      );
    });

    it("rejects when Google email is unverified (email_verified: false)", async () => {
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "unverified@gmail.com",
        email_verified: false,
        uid: "fb_unverified_1",
      } as any);

      await expect(authenticateWithGoogle("valid-but-unverified-token")).rejects.toThrow(
        /Your Google email is not verified/i
      );
    });

    it("rejects when Google token has no email address", async () => {
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: undefined,
        email_verified: true,
        uid: "fb_no_email_1",
      } as any);

      await expect(authenticateWithGoogle("no-email-token")).rejects.toThrow(
        /Google token does not contain a valid email address/i
      );
    });
  });

  describe("2. Unregistered / First-Time Google User Protection", () => {
    it("does NOT auto-create account and directs user to proper onboarding when email is not in MongoDB", async () => {
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "newuser@gmail.com",
        email_verified: true,
        name: "New User",
        uid: "fb_new_123",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce(null);

      await expect(authenticateWithGoogle("token_for_new_user")).rejects.toThrow(
        /No registered ATHLIX account found/i
      );

      // Verify no user record was created in the database
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe("3. Account Status & Tenant Isolation Enforcement", () => {
    it("rejects PENDING accounts (must activate with assigned ATHLIX ID first)", async () => {
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "pendingcoach@academy.com",
        email_verified: true,
        uid: "fb_pending_1",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: mockObjectId(),
        email: "pendingcoach@academy.com",
        name: "Pending Coach",
        role: "COACH",
        status: "PENDING",
      } as any);

      await expect(authenticateWithGoogle("pending_token")).rejects.toThrow(
        /Your account is pending activation/i
      );
    });

    it("rejects BLOCKED user accounts with administrative reason", async () => {
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "blocked@academy.com",
        email_verified: true,
        uid: "fb_blocked_1",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: mockObjectId(),
        email: "blocked@academy.com",
        name: "Blocked User",
        role: "COACH",
        status: "BLOCKED",
        blockedReason: "Disciplinary action",
      } as any);

      await expect(authenticateWithGoogle("blocked_token")).rejects.toThrow(
        /Your account has been blocked by Platform Administration: Disciplinary action/i
      );
    });

    it("rejects DEACTIVATED accounts", async () => {
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "deactivated@academy.com",
        email_verified: true,
        uid: "fb_deact_1",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: mockObjectId(),
        email: "deactivated@academy.com",
        name: "Deactivated User",
        role: "PLAYER",
        status: "DEACTIVATED",
      } as any);

      await expect(authenticateWithGoogle("deact_token")).rejects.toThrow(
        /Your account has been deactivated/i
      );
    });

    it("rejects non-admin users belonging to a BLOCKED sports academy tenant", async () => {
      const academyId = mockObjectId("650000000000000000000001");
      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "coach@blockedtenant.com",
        email_verified: true,
        uid: "fb_blocked_tenant_1",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: mockObjectId(),
        email: "coach@blockedtenant.com",
        name: "Tenant Coach",
        role: "COACH",
        status: "ACTIVE",
        academyId,
      } as any);

      vi.mocked(Academy.findById).mockResolvedValueOnce({
        _id: academyId,
        status: "BLOCKED",
        blockedReason: "Financial audit pending",
      } as any);

      await expect(authenticateWithGoogle("blocked_tenant_token")).rejects.toThrow(
        /Your sports academy tenant has been blocked by Platform Administration: Financial audit pending/i
      );
    });
  });

  describe("4. Role-Specific Authenticated Logins & Sport Resolution", () => {
    it("successfully logs in an existing Coach and derives assigned sport", async () => {
      const userId = mockObjectId("650000000000000000000002");
      const academyId = mockObjectId("650000000000000000000003");
      const coachDocId = mockObjectId("650000000000000000000004");

      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "marcus.cole@apexfootball.com",
        email_verified: true,
        name: "Marcus Cole",
        picture: "https://lh3.googleusercontent.com/avatar.jpg",
        uid: "fb_coach_marcus",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: userId,
        email: "marcus.cole@apexfootball.com",
        name: "Marcus Cole",
        role: "COACH",
        status: "ACTIVE",
        academyId,
        coachId: coachDocId,
        metadata: {},
      } as any);

      vi.mocked(Academy.findById).mockResolvedValueOnce({
        _id: academyId,
        status: "ACTIVE",
      } as any);

      vi.mocked(Coach.findOne).mockResolvedValueOnce({
        _id: coachDocId,
        userId,
        sport: "Football",
      } as any);

      const result = await authenticateWithGoogle("valid_coach_token");

      expect(result.payload.userId).toBe(userId.toString());
      expect(result.payload.role).toBe("COACH");
      expect(result.payload.sport).toBe("Football");
      expect(result.payload.coachId).toBe(coachDocId.toString());
      expect(result.payload.academyId).toBe(academyId.toString());

      // Verifies signed JWT token is valid and verifiable
      const session = await verifySessionToken(result.token);
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(userId.toString());
      expect(session?.role).toBe("COACH");
      expect(session?.sport).toBe("Football");
    });

    it("successfully logs in an existing Player and derives assigned sport and playerId", async () => {
      const userId = mockObjectId("650000000000000000000005");
      const academyId = mockObjectId("650000000000000000000006");
      const playerDocId = mockObjectId("650000000000000000000007");

      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "leo.vance@apexcricket.com",
        email_verified: true,
        name: "Leo Vance",
        uid: "fb_player_leo",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: userId,
        email: "leo.vance@apexcricket.com",
        name: "Leo Vance",
        role: "PLAYER",
        status: "ACTIVE",
        academyId,
        playerId: playerDocId,
        metadata: {},
      } as any);

      vi.mocked(Academy.findById).mockResolvedValueOnce({
        _id: academyId,
        status: "ACTIVE",
      } as any);

      vi.mocked(Player.findOne).mockResolvedValueOnce({
        _id: playerDocId,
        userId,
        sport: "Cricket",
      } as any);

      const result = await authenticateWithGoogle("valid_player_token");

      expect(result.payload.userId).toBe(userId.toString());
      expect(result.payload.role).toBe("PLAYER");
      expect(result.payload.sport).toBe("Cricket");
      expect(result.payload.playerId).toBe(playerDocId.toString());
    });

    it("successfully logs in an existing Academy Owner", async () => {
      const userId = mockObjectId("650000000000000000000008");
      const academyId = mockObjectId("650000000000000000000009");

      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "owner@apexacademy.com",
        email_verified: true,
        name: "David Sterling",
        uid: "fb_owner_david",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: userId,
        email: "owner@apexacademy.com",
        name: "David Sterling",
        role: "ACADEMY_OWNER",
        status: "ACTIVE",
        academyId,
        metadata: {},
      } as any);

      vi.mocked(Academy.findById).mockResolvedValueOnce({
        _id: academyId,
        status: "ACTIVE",
      } as any);

      const result = await authenticateWithGoogle("valid_owner_token");

      expect(result.payload.userId).toBe(userId.toString());
      expect(result.payload.role).toBe("ACADEMY_OWNER");
      expect(result.payload.academyId).toBe(academyId.toString());
    });

    it("successfully logs in a SUPER_ADMIN and preserves platform permissions without academy scope", async () => {
      const userId = mockObjectId("65000000000000000000000a");

      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "ayushkumar2005hmhs@gmail.com",
        email_verified: true,
        name: "Ayush Kumar (Super Admin)",
        uid: "fb_super_admin_ayush",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: userId,
        email: "ayushkumar2005hmhs@gmail.com",
        name: "Ayush Kumar",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        academyId: null,
        metadata: {},
      } as any);

      const result = await authenticateWithGoogle("valid_super_admin_token");

      expect(result.payload.userId).toBe(userId.toString());
      expect(result.payload.role).toBe("SUPER_ADMIN");
      expect(result.payload.academyId).toBeUndefined();
      // Super admin is not subject to tenant checks
      expect(Academy.findById).not.toHaveBeenCalled();
    });
  });

  describe("5. Account Linking & No Duplication Policy", () => {
    it("updates existing account metadata (lastLoginAt, lastLoginMethod) without creating duplicates", async () => {
      const userId = mockObjectId("65000000000000000000000b");
      const academyId = mockObjectId("65000000000000000000000c");

      vi.mocked(firebaseAdmin.verifyFirebaseIdToken).mockResolvedValueOnce({
        email: "coach.alex@apex.com",
        email_verified: true,
        picture: "https://lh3.googleusercontent.com/avatar_new.jpg",
        uid: "fb_coach_alex",
      } as any);

      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: userId,
        email: "coach.alex@apex.com",
        name: "Alex",
        role: "COACH",
        status: "ACTIVE",
        academyId,
        metadata: {},
      } as any);

      vi.mocked(Academy.findById).mockResolvedValueOnce({
        _id: academyId,
        status: "ACTIVE",
      } as any);

      vi.mocked(Coach.findOne).mockResolvedValueOnce({
        _id: mockObjectId(),
        userId,
        sport: "Basketball",
      } as any);

      await authenticateWithGoogle("valid_alex_token");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          $set: expect.objectContaining({
            "metadata.lastLoginMethod": "GOOGLE",
            "metadata.avatarUrl": "https://lh3.googleusercontent.com/avatar_new.jpg",
          }),
        })
      );
    });
  });
});
