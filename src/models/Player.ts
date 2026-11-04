import mongoose, { Schema, Document, Model } from "mongoose";
import { PlayerStatus } from "@/types";

export interface IPlayerDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  playerCode: string;
  name: string;
  dateOfBirth: Date;
  gender: "MALE" | "FEMALE" | "OTHER";
  sport: string;
  position: string;
  photoUrl?: string;
  enrollmentDate: Date;
  contact?: {
    phone?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  status: PlayerStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayerDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    coachId: { type: Schema.Types.ObjectId, ref: "Coach", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    playerCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: "MALE",
    },
    sport: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: "" },
    enrollmentDate: { type: Date, required: true, default: Date.now },
    contact: {
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      emergencyContactName: { type: String, default: "" },
      emergencyContactPhone: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INJURED", "DEACTIVATED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

PlayerSchema.index({ academyId: 1, playerCode: 1 }, { unique: true });
PlayerSchema.index({ academyId: 1, coachId: 1, status: 1 });
PlayerSchema.index({ academyId: 1, sport: 1 });
PlayerSchema.index({ userId: 1 });

export const Player: Model<IPlayerDocument> =
  mongoose.models.Player || mongoose.model<IPlayerDocument>("Player", PlayerSchema);
