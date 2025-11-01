import express from "express"
import ProjectProgress from "../models/ProjectProgress.js";

// ✅ GET — fetch progress for a given month
export const getMonthlyProgress = async (req, res) => {
  try {
    const { year, month } = req.query; // month = 1-indexed from frontend
    if (!year || !month)
      return res.status(400).json({ success: false, message: "Missing year or month" });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const data = await ProjectProgress.find({
      date: { $gte: start, $lte: end },
    });

    res.json(data);
  } catch (err) {
    console.error("Error fetching monthly progress:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ POST — create or update a progress record
export const saveProgress = async (req, res) => {
  try {
    const { projectId, projectName, date, progress, note } = req.body;
    if (!projectId || !date || progress === undefined)
      return res.status(400).json({ success: false, message: "Missing fields" });

    // Prevent duplicate entries for same project & date
    const dateOnly = new Date(date);
    const start = new Date(dateOnly.setHours(0, 0, 0, 0));
    const end = new Date(dateOnly.setHours(23, 59, 59, 999));

    let existing = await ProjectProgress.findOne({
      projectId,
      date: { $gte: start, $lte: end },
    });

    if (existing) {
      existing.progress = progress;
      existing.note = note;
      existing.projectName = projectName;
      const updated = await existing.save();
      return res.json(updated);
    }

    const newProgress = await ProjectProgress.create({
      projectId,
      projectName,
      progress,
      note,
      date,
    });

    res.json(newProgress);
  } catch (err) {
    console.error("Error saving progress:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ DELETE — remove a specific entry
export const deleteProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ProjectProgress.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Progress not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting progress:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getDailyProjectProgress = async (req, res) => {
  try {
    const data = await ProjectProgress.find().sort({ date: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching daily project progress:", error);
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
};
