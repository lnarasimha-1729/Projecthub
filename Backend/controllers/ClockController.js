import ClockModel from "../models/ClockModel.js";

// Add new clock entry
export const addClockEntry = async (req, res) => {
  try {
    const { worker, project, type, time } = req.body;
    const clock = new ClockModel({ worker, project, type, time });
    await clock.save();
    res.status(200).json({ message: "Clock entry saved", clock });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all clock entries
export const getClockEntries = async (req, res) => {
  try {
    const entries = await ClockModel.find().sort({ time: -1 });
    res.status(200).json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};