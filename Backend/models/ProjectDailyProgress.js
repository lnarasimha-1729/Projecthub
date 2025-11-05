import mongoose from "mongoose";

const ProjectDailyProgressSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  projectName: { type: String, required: true },
  dates: { type: [String], default: [] },       // array of "YYYY-MM-DD"
  progresses: { type: [Number], default: [] },  // numeric progress, aligned by index with dates
}, { timestamps: true, collection: 'projectdailyprogress' });

export default mongoose.model('ProjectDailyProgress', ProjectDailyProgressSchema);
