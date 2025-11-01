import express from "express"
import { addClockEntry, getClockEntries } from "../controllers/ClockController.js";
import ClockModel from "../models/ClockModel.js";

const clockRouter = express.Router()

clockRouter.post("/clock",addClockEntry)
clockRouter.get("/get-clocks",getClockEntries)
clockRouter.post("/clock/entry", async (req, res) => {
  try {
    const { worker, project, type, location } = req.body;

    if (!worker || !project || !type) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const newEntry = new ClockModel({
      worker,
      project,
      type,
      time: new Date(),
      location: {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      },
    });

    await newEntry.save();
    res.json({ success: true, message: "Clock entry saved with location", entry: newEntry });
  } catch (error) {
    console.error("Error saving clock entry:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default clockRouter;