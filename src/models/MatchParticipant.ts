import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatchParticipantDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  matchId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  score: number;
  minutesPlayed?: number;
  performanceNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MatchParticipantSchema = new Schema<IMatchParticipantDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    score: { type: Number, required: true, min: 0, default: 0 },
    minutesPlayed: { type: Number, default: 0 },
    performanceNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

MatchParticipantSchema.index({ matchId: 1, playerId: 1 }, { unique: true });
MatchParticipantSchema.index({ academyId: 1, playerId: 1 });
MatchParticipantSchema.index({ playerId: 1 });

export const MatchParticipant: Model<IMatchParticipantDocument> =
  mongoose.models.MatchParticipant ||
  mongoose.model<IMatchParticipantDocument>("MatchParticipant", MatchParticipantSchema);
