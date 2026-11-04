import mongoose, { Schema, Document, Model } from "mongoose";
import { InvitationStatus } from "@/types";

export interface IInvitationDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  email: string;
  role: "COACH" | "SCOUT" | "PLAYER";
  token: string;
  coachId?: mongoose.Types.ObjectId;
  sport?: string;
  invitedBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitationDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ["COACH", "SCOUT", "PLAYER"],
      required: true,
    },
    token: { type: String, required: true, unique: true },
    coachId: { type: Schema.Types.ObjectId, ref: "Coach", default: null },
    sport: { type: String, default: "" },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

InvitationSchema.index({ academyId: 1, email: 1 });
InvitationSchema.index({ expiresAt: 1 });

export const Invitation: Model<IInvitationDocument> =
  mongoose.models.Invitation || mongoose.model<IInvitationDocument>("Invitation", InvitationSchema);
