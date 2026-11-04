import mongoose, { Schema, Document, Model } from "mongoose";
import { SessionStatus } from "@/types";

export interface IPracticeSessionDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  sport: string;
  date: Date; // Normalized to YYYY-MM-DD
  title?: string;
  timeSlot?: {
    startTime: string;
    endTime: string;
  };
  status: SessionStatus;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PracticeSessionSchema = new Schema<IPracticeSessionDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    coachId: { type: Schema.Types.ObjectId, ref: "Coach", required: true },
    sport: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    title: { type: String, default: "" },
    timeSlot: {
      startTime: { type: String, default: "07:00" },
      endTime: { type: String, default: "09:00" },
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },
    closedAt: { type: Date, default: null },
    closedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
  }
);

PracticeSessionSchema.index(
  { academyId: 1, coachId: 1, date: 1, sport: 1 },
  { unique: true }
);
PracticeSessionSchema.index({ academyId: 1, status: 1 });
PracticeSessionSchema.index({ coachId: 1, date: -1 });

export const PracticeSession: Model<IPracticeSessionDocument> =
  mongoose.models.PracticeSession ||
  mongoose.model<IPracticeSessionDocument>("PracticeSession", PracticeSessionSchema);
