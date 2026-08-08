import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript type safety
export interface IComplaint extends Document {
  studentId: string;
  studentName: string;
  className: string;
  classId: string;
  description: string;
  status: string;
  createdAt: Date;
}

const complaintSchema: Schema = new Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  className: { type: String, default: "N/A" },
  classId: { type: String, default: "N/A" },
  description: { type: String, required: true },
  status: { type: String, default: "Pending" }, // Pending / Resolved
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IComplaint>("Complaint", complaintSchema);