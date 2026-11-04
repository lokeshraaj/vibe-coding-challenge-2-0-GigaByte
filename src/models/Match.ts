import mongoose, { Schema, Document, Model } from "mongoose";
import { MatchResult } from "@/types";

export interface IMatchDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  date: Date;
  sport: string;
  opponentName: string;
  venue?: string;
  scoreLabel: string;
  academyTeamScore: number;
  opponentScore: number;
  result: MatchResult;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatchDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    coachId: { type: Schema.Types.ObjectId, ref: "Coach", required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "PracticeSession", required: true },
    date: { type: Date, required: true },
    sport: { type: String, required: true, trim: true },
    opponentName: { type: String, required: true, trim: true },
    venue: { type: String, default: "" },
    scoreLabel: { type: String, default: "Goals" },
    academyTeamScore: { type: Number, required: true, min: 0 },
    opponentScore: { type: Number, required: true, min: 0 },
    result: {
      type: String,
      enum: ["WON", "LOST", "DRAW", "ABANDONED"],
      default: "WON",
    },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

MatchSchema.index({ academyId: 1, coachId: 1, date: -1 });
MatchSchema.index({ sessionId: 1 });
MatchSchema.index({ academyId: 1, sport: 1 });

export const Match: Model<IMatchDocument> =
  mongoose.models.Match || mongoose.model<IMatchDocument>("Match", MatchSchema);
