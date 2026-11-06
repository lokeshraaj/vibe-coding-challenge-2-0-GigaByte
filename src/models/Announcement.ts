import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncementDocument extends Document {
  title: string;
  content: string;
  category: "GENERAL" | "MAINTENANCE" | "FEATURE" | "ALERT";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  targetAudience: "ALL" | "ACADEMY_OWNERS" | "COACHES" | "PLAYERS" | "SCOUTS";
  targetAcademyIds: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncementDocument>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ["GENERAL", "MAINTENANCE", "FEATURE", "ALERT"],
      default: "GENERAL",
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
    },
    targetAudience: {
      type: String,
      enum: ["ALL", "ACADEMY_OWNERS", "COACHES", "PLAYERS", "SCOUTS"],
      default: "ALL",
    },
    targetAcademyIds: [{ type: Schema.Types.ObjectId, ref: "Academy" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

AnnouncementSchema.index({ active: 1, createdAt: -1 });
AnnouncementSchema.index({ targetAudience: 1 });

export const Announcement: Model<IAnnouncementDocument> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncementDocument>("Announcement", AnnouncementSchema);
