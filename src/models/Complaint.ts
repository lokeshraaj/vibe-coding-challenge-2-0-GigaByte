import mongoose, { Schema, Document, Model } from "mongoose";
import { ComplaintStatus, UserRole } from "@/types";

export interface IComplaintDocument extends Document {
  reporterId: mongoose.Types.ObjectId;
  reporterRole: UserRole;
  targetType: "USER" | "ACADEMY" | "COACH" | "PLAYER" | "MATCH" | "OTHER";
  targetId: string;
  targetName?: string;
  academyId?: mongoose.Types.ObjectId;
  subject: string;
  category: "CONDUCT" | "ATTENDANCE_FRAUD" | "UNAUTHORIZED_ACCESS" | "MATCH_DISPUTE" | "SAFETY" | "OTHER";
  description: string;
  evidenceUrls: string[];
  status: ComplaintStatus;
  internalNotes?: string;
  assignedAdminId?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaintDocument>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reporterRole: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["USER", "ACADEMY", "COACH", "PLAYER", "MATCH", "OTHER"],
      required: true,
    },
    targetId: { type: String, required: true },
    targetName: { type: String, default: "" },
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", default: null },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["CONDUCT", "ATTENDANCE_FRAUD", "UNAUTHORIZED_ACCESS", "MATCH_DISPUTE", "SAFETY", "OTHER"],
      default: "OTHER",
    },
    description: { type: String, required: true },
    evidenceUrls: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["OPEN", "UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "REJECTED"],
      default: "OPEN",
    },
    internalNotes: { type: String, default: "" },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

ComplaintSchema.index({ status: 1, createdAt: -1 });
ComplaintSchema.index({ academyId: 1 });
ComplaintSchema.index({ reporterId: 1 });
ComplaintSchema.index({ targetType: 1, targetId: 1 });

export const Complaint: Model<IComplaintDocument> =
  mongoose.models.Complaint || mongoose.model<IComplaintDocument>("Complaint", ComplaintSchema);
