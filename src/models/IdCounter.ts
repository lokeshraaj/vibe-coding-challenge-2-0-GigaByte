import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIdCounterDocument extends Document {
  academyId: mongoose.Types.ObjectId;
  userType: "COACH" | "PLAYER" | "SCOUT";
  sportCode: string;
  seq: number;
  createdAt: Date;
  updatedAt: Date;
}

const IdCounterSchema = new Schema<IIdCounterDocument>(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    userType: {
      type: String,
      enum: ["COACH", "PLAYER", "SCOUT"],
      required: true,
    },
    sportCode: { type: String, required: true, uppercase: true, trim: true },
    seq: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Atomic unique counter per academy, userType, and sport
IdCounterSchema.index(
  { academyId: 1, userType: 1, sportCode: 1 },
  { unique: true }
);

export const IdCounter: Model<IIdCounterDocument> =
  mongoose.models.IdCounter ||
  mongoose.model<IIdCounterDocument>("IdCounter", IdCounterSchema);
