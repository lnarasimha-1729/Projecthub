// models/ProjectProgress.js
import mongoose from "mongoose";

const EntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  progress: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const ProjectProgressSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, unique: true },
  projectName: String,
  entries: { type: [EntrySchema], default: [] }
}, { timestamps: true });

// Optional: index to prevent duplicate date entries per project using a partial unique index
// Mongo db-level uniqueness on array elements isn't trivial; we'll enforce at app level.

export default module.exports = mongoose.model("ProjectProgress", ProjectProgressSchema);
