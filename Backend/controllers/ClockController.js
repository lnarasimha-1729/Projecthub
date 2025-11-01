import ClockModel from "../models/ClockModel.js";

// Add new clock entry
export const addClockEntry = async (req, res) => {
  try {
    const { worker, project, type, time, location } = req.body;

    if (!worker || !project || !type || !time) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const newEntry = await ClockModel.create({
      worker,
      project,
      type,
      time,
      location: location || null, // ✅ store location
    });

    return res.status(201).json({ success: true, clock: newEntry });
  } catch (error) {
    console.error("Error creating clock entry:", error);
    res.status(500).json({ success: false, message: "Server error" });
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