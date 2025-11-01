import mongoose from "mongoose";

const ClockSchema = new mongoose.Schema({
  worker: { type: String, required: true },
  project: { type: String, required: true },
  type: { type: String, enum: ["clock-in", "clock-out"], required: true },
  time: { type: Date, default: Date.now },
  location: {
    latitude: Number,
    longitude: Number,
  },
});

export default mongoose.model("Clock", ClockSchema);