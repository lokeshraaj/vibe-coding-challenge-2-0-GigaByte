import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICoachDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sport: string;
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  assignedScoutId?: mongoose.Types.ObjectId;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

const CoachSchema = new Schema<ICoachDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sport: { type: String, required: true, trim: true },
    specialization: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    assignedScoutId: { type: Schema.Types.ObjectId, ref: "Scout", default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

CoachSchema.index({ academyId: 1, userId: 1 });
CoachSchema.index({ academyId: 1, sport: 1 });
CoachSchema.index({ academyId: 1, assignedScoutId: 1 });

export const Coach: Model<ICoachDocument> =
  mongoose.models.Coach || mongoose.model<ICoachDocument>("Coach", CoachSchema);
