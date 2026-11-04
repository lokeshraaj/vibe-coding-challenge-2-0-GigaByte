import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole, UserStatus } from "@/types";

export interface IUserDocument extends Document {
  academyId?: mongoose.Types.ObjectId;
  role: UserRole;
  name: string;
  email: string;
  passwordHash?: string;
  status: UserStatus;
  coachId?: mongoose.Types.ObjectId;
  playerId?: mongoose.Types.ObjectId;
  metadata?: {
    phone?: string;
    avatarUrl?: string;
    lastLoginAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", default: null },
    role: {
      type: String,
      enum: ["PLATFORM_ADMIN", "ACADEMY_OWNER", "COACH", "SCOUT", "PLAYER"],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    status: {
      type: String,
      enum: ["ACTIVE", "INVITED", "DEACTIVATED"],
      default: "ACTIVE",
    },
    coachId: { type: Schema.Types.ObjectId, ref: "Coach", default: null },
    playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    metadata: {
      phone: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
      lastLoginAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ academyId: 1, role: 1 });
UserSchema.index({ academyId: 1, status: 1 });

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
