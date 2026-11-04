import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/mongodb-client";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User, Coach, Scout, Invitation, Player } from "@/models";
import { AuthSessionPayload, UserRole } from "@/types";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      const normalizedEmail = user.email.toLowerCase().trim();

      await connectToDatabase();

      // Look up existing user
      let existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        if (existingUser.status === "DEACTIVATED") {
          return false;
        }

        // Update avatar if available
        if (user.image && (!existingUser.metadata || !existingUser.metadata.avatarUrl)) {
          existingUser.metadata = {
            ...existingUser.metadata,
            avatarUrl: user.image,
          };
          await existingUser.save();
        }
        return true;
      }

      // New Google User: Strictly enforce server-side role resolution rules!
      // Check if this email is the configured platform super admin
      const initialAdminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL?.toLowerCase().trim();
      if (initialAdminEmail && normalizedEmail === initialAdminEmail) {
        await User.create({
          name: user.name || "Platform Super Admin",
          email: normalizedEmail,
          role: "PLATFORM_ADMIN",
          status: "ACTIVE",
          metadata: {
            avatarUrl: user.image || "",
          },
        });
        return true;
      }

      // Check if email has a pending invitation
      const invitation = await Invitation.findOne({
        email: normalizedEmail,
        status: "PENDING",
        expiresAt: { $gt: new Date() },
      });

      if (invitation) {
        const newUser = await User.create({
          academyId: invitation.academyId,
          role: invitation.role,
          name: user.name || "Athlix Member",
          email: normalizedEmail,
          status: "ACTIVE",
          coachId: invitation.coachId || null,
          metadata: { avatarUrl: user.image || "" },
        });

        invitation.status = "ACCEPTED";
        await invitation.save();
        return true;
      }

      // Default for unknown Google accounts: Create unprivileged user.
      // Must not automatically receive ACADEMY_OWNER or PLATFORM_ADMIN!
      await User.create({
        name: user.name || "Athlix User",
        email: normalizedEmail,
        role: "PLAYER", // Default unprivileged base role
        status: "ACTIVE",
        academyId: null, // No academy access granted by default!
        metadata: {
          avatarUrl: user.image || "",
        },
      });

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (token.email) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: token.email.toLowerCase().trim() });
        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.role = dbUser.role;
          token.academyId = dbUser.academyId ? dbUser.academyId.toString() : undefined;
          token.coachId = dbUser.coachId ? dbUser.coachId.toString() : undefined;
          token.playerId = dbUser.playerId ? dbUser.playerId.toString() : undefined;
          token.status = dbUser.status;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).role = token.role;
        (session.user as any).academyId = token.academyId;
        (session.user as any).coachId = token.coachId;
        (session.user as any).playerId = token.playerId;
        (session.user as any).status = token.status;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.JWT_SECRET || "athlix_super_secure_production_ready_jwt_secret_key_2026_xyz987654321",
});
