import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOtpChallengeDocument extends Document {
  identifier: string; // Coach ID (e.g. COFO001), Player ID (e.g. PLFO001), Scout ID (e.g. SCFO001), or email
  email: string;
  role: "COACH" | "PLAYER" | "SCOUT";
  otpHash: string; // Cryptographic SHA-256 hash of the 6-digit OTP
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt?: Date | null;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OtpChallengeSchema = new Schema<IOtpChallengeDocument>(
  {
    identifier: { type: String, required: true, uppercase: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ["COACH", "PLAYER", "SCOUT"],
      required: true,
    },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    ipAddress: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

OtpChallengeSchema.index({ identifier: 1, createdAt: -1 });
OtpChallengeSchema.index({ email: 1 });
OtpChallengeSchema.index({ expiresAt: 1 });

export const OtpChallenge: Model<IOtpChallengeDocument> =
  mongoose.models.OtpChallenge ||
  mongoose.model<IOtpChallengeDocument>("OtpChallenge", OtpChallengeSchema);
