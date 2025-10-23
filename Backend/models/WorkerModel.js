import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    Name: { type: String, required: true },
    Role: { type: String, required: true },
    workerType : {type : String, required: true},
    completedProjects : {type : Number, default : 0}
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Worker", workerSchema); // ✅ capitalized model name