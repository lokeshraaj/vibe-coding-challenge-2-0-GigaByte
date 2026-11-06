import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICoachDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  coachCode?: string;
  name?: string;
  email?: string;
  phone?: string;
  sport: string;
  assignedSports: string[];
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  assignedScoutId?: mongoose.Types.ObjectId;
  accountStatus: "PENDING" | "ACTIVE" | "INACTIVE";
  status: "ACTIVE" | "INACTIVE";
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CoachSchema = new Schema<ICoachDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    coachCode: { type: String, sparse: true, uppercase: true, trim: true },
    phone: { type: String, default: "" },
    sport: { type: String, required: true, trim: true },
    assignedSports: [{ type: String, trim: true }],
    specialization: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    assignedScoutId: { type: Schema.Types.ObjectId, ref: "Scout", default: null },
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

CoachSchema.index({ academyId: 1, userId: 1 });
CoachSchema.index({ academyId: 1, coachCode: 1 }, { unique: true, sparse: true });
CoachSchema.index({ academyId: 1, sport: 1 });
CoachSchema.index({ academyId: 1, assignedScoutId: 1 });

export const Coach: Model<ICoachDocument> =
  mongoose.models.Coach || mongoose.model<ICoachDocument>("Coach", CoachSchema);
