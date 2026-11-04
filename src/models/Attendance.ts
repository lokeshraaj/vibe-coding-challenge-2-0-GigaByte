import mongoose, { Schema, Document, Model } from "mongoose";
import { AttendanceStatus } from "@/types";

export interface IAttendanceDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    coachId: { type: Schema.Types.ObjectId, ref: "Coach", required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "PracticeSession", required: true },
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      required: true,
    },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ sessionId: 1, playerId: 1 }, { unique: true });
AttendanceSchema.index({ academyId: 1, coachId: 1, playerId: 1, status: 1 });
AttendanceSchema.index({ playerId: 1, status: 1 });

export const Attendance: Model<IAttendanceDocument> =
  mongoose.models.Attendance || mongoose.model<IAttendanceDocument>("Attendance", AttendanceSchema);
