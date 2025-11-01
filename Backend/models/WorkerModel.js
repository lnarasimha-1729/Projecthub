import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    Name: { type: String, required: true },
    Role: { type: String, required: true },
    workerType : {type : String, required: true},
    completedProjects : {type : Number, default : 0},
    totalHoursWorked: { type: Number, default: 0 },
    clockInTime: Date,
  clockOutTime: Date,
  isClockedIn: { type: Boolean, default: false },
  location: {
    latitude: Number,
    longitude: Number,
  },

  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Worker", workerSchema); // ✅ capitalized model name