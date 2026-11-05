import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemProvisioningDocument extends Document {
  identifier: string; // e.g. "initial_super_admin"
  status: "COMPLETED" | "FAILED";
  userId: mongoose.Types.ObjectId;
  email: string;
  role: string;
  completedAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SystemProvisioningSchema = new Schema<ISystemProvisioningDocument>(
  {
    identifier: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["COMPLETED", "FAILED"],
      required: true,
      default: "COMPLETED",
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, required: true, default: "SUPER_ADMIN" },
    completedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const SystemProvisioning: Model<ISystemProvisioningDocument> =
  mongoose.models.SystemProvisioning ||
  mongoose.model<ISystemProvisioningDocument>("SystemProvisioning", SystemProvisioningSchema);
