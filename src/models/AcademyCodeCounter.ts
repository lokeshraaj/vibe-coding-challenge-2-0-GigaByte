import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAcademyCodeCounterDocument extends Document {
  stateCode: string;
  seq: number;
  createdAt: Date;
  updatedAt: Date;
}

const AcademyCodeCounterSchema = new Schema<IAcademyCodeCounterDocument>(
  {
    stateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const AcademyCodeCounter: Model<IAcademyCodeCounterDocument> =
  mongoose.models.AcademyCodeCounter ||
  mongoose.model<IAcademyCodeCounterDocument>("AcademyCodeCounter", AcademyCodeCounterSchema);
