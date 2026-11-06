import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPendingAcademyRegistrationDocument extends Document {
  challengeId: string;
  registrationData: {
    academyName: string;
    description?: string;
    city: string;
    state: string;
    country: string;
    address?: string;
    contactEmail: string;
    contactPhone: string;
    ownerName: string;
    ownerEmail: string;
    passwordHash: string;
  };
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt?: Date | null;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PendingAcademyRegistrationSchema = new Schema<IPendingAcademyRegistrationDocument>(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    registrationData: {
      academyName: { type: String, required: true },
      description: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      address: { type: String, default: "" },
      contactEmail: { type: String, required: true },
      contactPhone: { type: String, required: true },
      ownerName: { type: String, required: true },
      ownerEmail: { type: String, required: true },
      passwordHash: { type: String, required: true },
    },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    ipAddress: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

PendingAcademyRegistrationSchema.index({ "registrationData.ownerEmail": 1 });
PendingAcademyRegistrationSchema.index({ expiresAt: 1 });

export const PendingAcademyRegistration: Model<IPendingAcademyRegistrationDocument> =
  mongoose.models.PendingAcademyRegistration ||
  mongoose.model<IPendingAcademyRegistrationDocument>(
    "PendingAcademyRegistration",
    PendingAcademyRegistrationSchema
  );
