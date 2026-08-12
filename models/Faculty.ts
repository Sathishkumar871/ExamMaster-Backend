import mongoose, { Document, Schema } from "mongoose";

export interface IFaculty extends Document {
  name: string;
  designation: string;
  role: "ceo" | "principal" | "department-head" | "teacher";
  department: string;
  subject: string;
  qualification: string;
  experience: string;
  image: string;
  email?: string;
  phone?: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

const FacultySchema = new Schema<IFaculty>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: [
        "ceo",
        "principal",
        "department-head",
        "teacher",
      ],
      default: "teacher",
      required: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    qualification: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IFaculty>(
  "Faculty",
  FacultySchema
);