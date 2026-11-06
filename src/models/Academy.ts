import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAcademyDocument extends Document {
  name: string;
  slug: string;
  academyCode?: string;
  state?: string;
  logo?: string;
  description?: string;
  location: {
    address?: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  contactEmail: string;
  contactPhone: string;
  ownerId: mongoose.Types.ObjectId;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: Date;
  updatedAt: Date;
}

const AcademySchema = new Schema<IAcademyDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    academyCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    state: { type: String, trim: true },
    logo: { type: String, default: "" },
    description: { type: String, default: "" },
    location: {
      address: { type: String, default: "" },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
      postalCode: { type: String, default: "" },
    },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "SUSPENDED", "DEACTIVATED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

AcademySchema.index({ status: 1 });
AcademySchema.index({ ownerId: 1 });
AcademySchema.index({ academyCode: 1 }, { unique: true, sparse: true });

export const Academy: Model<IAcademyDocument> =
  mongoose.models.Academy || mongoose.model<IAcademyDocument>("Academy", AcademySchema);
