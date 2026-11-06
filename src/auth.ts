import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/mongodb-client";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User, Coach, Scout, Player, Account } from "@/models";

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
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB || "athlix_dev",
  }),
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const normalizedEmail = user.email.toLowerCase().trim();

      await connectToDatabase();

      // Look up existing ATHLIX user account
      let existingUser = await User.findOne({ email: normalizedEmail });

      // Rule: Unregistered accounts are NEVER automatically created or promoted.
      // Super Admin accounts can only be provisioned through server-side CLI.
      if (!existingUser) {
        console.warn(`[Google Auth Rejected] No authorized ATHLIX account found for email: ${normalizedEmail}`);
        return false;
      }

      // Rule 5 & 6: Pending Coach and Player accounts CANNOT use Google Sign-In until activated via ID + OTP
      if (existingUser.status === "PENDING") {
        console.warn(`[Google Auth Blocked] Account ${normalizedEmail} is pending activation via ATHLIX ID`);
        return false;
      }

      // Deactivated accounts cannot sign in
      if (existingUser.status === "DEACTIVATED") {
        return false;
      }

      // Rule 8: Ensure secure Google account link without altering tenant/role
      if (account && account.provider === "google") {
        try {
          const existingAccount = await Account.findOne({
            provider: "google",
            providerAccountId: account.providerAccountId,
          });

          if (!existingAccount) {
            await Account.create({
              userId: existingUser._id,
              type: account.type || "oauth",
              provider: "google",
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              expires_at: account.expires_at,
              id_token: account.id_token,
              scope: account.scope,
              token_type: account.token_type,
            });
          }
        } catch (accErr) {
          console.warn("[Account Link Warning]", accErr);
        }
      }

      // Update avatar if not yet set
      if (user.image && (!existingUser.metadata || !existingUser.metadata.avatarUrl)) {
        existingUser.metadata = {
          ...existingUser.metadata,
          avatarUrl: user.image,
        };
        await existingUser.save();
      }

      return true;
    },

    async jwt({ token, user }) {
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
