import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScoutDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assignedCoachId: mongoose.Types.ObjectId;
  scoutCode?: string;
  organization?: string;
  experienceYears?: number;
  accountStatus: "PENDING" | "ACTIVE" | "INACTIVE";
  status: "ACTIVE" | "INACTIVE";
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScoutSchema = new Schema<IScoutDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedCoachId: { type: Schema.Types.ObjectId, ref: "Coach", required: true },
    scoutCode: { type: String, sparse: true, uppercase: true, trim: true },
    organization: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    accountStatus: {
      type: String,
      enum: ["PENDING", "ACTIVE", "INACTIVE"],
      default: "PENDING",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    activatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

ScoutSchema.index({ academyId: 1, userId: 1 });
ScoutSchema.index({ academyId: 1, scoutCode: 1 }, { unique: true, sparse: true });
ScoutSchema.index({ academyId: 1, assignedCoachId: 1 });

export const Scout: Model<IScoutDocument> =
  mongoose.models.Scout || mongoose.model<IScoutDocument>("Scout", ScoutSchema);
