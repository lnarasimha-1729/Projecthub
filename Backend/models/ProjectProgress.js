import mongoose from "mongoose";

const ProjectProgressSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  // Parallel arrays — same length; date strings stored as "YYYY-MM-DD"
  dates: [{ type: String, required: true }],       // e.g. "2025-11-11"
  progresses: [{ type: Number, required: true }],  // e.g. 10, 70
  notes: [{ type: String, default: "" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ProjectProgressSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("ProjectProgress", ProjectProgressSchema);
