import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlatformSettingDocument extends Document {
  key: string;
  value: Record<string, unknown>;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingSchema = new Schema<IPlatformSettingDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
  }
);

export const PlatformSetting: Model<IPlatformSettingDocument> =
  mongoose.models.PlatformSetting ||
  mongoose.model<IPlatformSettingDocument>("PlatformSetting", PlatformSettingSchema);
