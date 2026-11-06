import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPasswordResetChallengeDocument extends Document {
  challengeId: string;
  identifier: string; // Athlix ID or email
  email: string;
  userId: mongoose.Types.ObjectId;
  academyId?: mongoose.Types.ObjectId;
  academyCode?: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt?: Date | null;
  resetTokenHash?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetChallengeSchema = new Schema<IPasswordResetChallengeDocument>(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    identifier: { type: String, required: true, uppercase: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    academyId: { type: Schema.Types.ObjectId, ref: "Academy" },
    academyCode: { type: String, uppercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    resetTokenHash: { type: String },
    ipAddress: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

PasswordResetChallengeSchema.index({ email: 1, createdAt: -1 });
PasswordResetChallengeSchema.index({ identifier: 1, createdAt: -1 });
PasswordResetChallengeSchema.index({ expiresAt: 1 });

export const PasswordResetChallenge: Model<IPasswordResetChallengeDocument> =
  mongoose.models.PasswordResetChallenge ||
  mongoose.model<IPasswordResetChallengeDocument>(
    "PasswordResetChallenge",
    PasswordResetChallengeSchema
  );
