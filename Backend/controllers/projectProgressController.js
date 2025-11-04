// controllers/projectProgressController.js
import Project from "../models/ProjectModel.js";
import mongoose from "mongoose";

/**
 * Helper: returns true if two dates are same calendar day
 */
const sameDay = (d1, d2) => {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
};

// GET /api/project-progress?year=YYYY&month=M
export const getMonthlyProgress = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: "Missing year or month" });
    }

    // start and end date for month
    const start = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    // find projects that have dailyProgress in this range
    const projects = await Project.find({
      "dailyProgress.date": { $gte: start, $lte: end },
    }).lean();

    const out = [];

    projects.forEach((proj) => {
      (proj.dailyProgress || []).forEach((entry) => {
        if (new Date(entry.date) >= start && new Date(entry.date) <= end) {
          out.push({
            _id: entry._id,
            projectId: proj._id,
            projectName: proj.projectName,
            progress: entry.progress,
            note: entry.note,
            date: entry.date,
            workerId: entry.workerId || null,
            latitude: entry.latitude || null,
            longitude: entry.longitude || null,
          });
        }
      });
    });

    res.json(out);
  } catch (err) {
    console.error("Error fetching monthly progress:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/project-progress
export const saveProgress = async (req, res) => {
  try {
    const { projectId, projectName, date, progress, note, workerId, latitude, longitude } = req.body;
    if (!projectId || !date || progress === undefined) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const targetDate = new Date(date);
    // check for existing entry for same date
    const existing = project.dailyProgress.find((e) => sameDay(e.date, targetDate));

    if (existing) {
      // update
      existing.progress = progress;
      existing.note = note || existing.note;
      existing.workerId = workerId ? mongoose.Types.ObjectId(workerId) : existing.workerId;
      existing.latitude = latitude !== undefined ? latitude : existing.latitude;
      existing.longitude = longitude !== undefined ? longitude : existing.longitude;
      await project.save();
      return res.json({ success: true, saved: existing });
    }

    // push new entry
    const newEntry = {
      date: targetDate,
      progress,
      note: note || "",
      workerId: workerId ? mongoose.Types.ObjectId(workerId) : null,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
    };

    project.dailyProgress.push(newEntry);
    await project.save();

    // return the last pushed entry (it will have an _id assigned)
    const saved = project.dailyProgress[project.dailyProgress.length - 1];
    return res.status(201).json({ success: true, saved });
  } catch (err) {
    console.error("Error saving progress:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /api/project-progress/:projectId/entry/:entryId
export const deleteProgress = async (req, res) => {
  try {
    const { projectId, entryId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const origLen = project.dailyProgress.length;
    project.dailyProgress = project.dailyProgress.filter((e) => String(e._id) !== String(entryId));

    if (project.dailyProgress.length === origLen)
      return res.status(404).json({ success: false, message: "Entry not found" });

    await project.save();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Error deleting progress:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/project-progress/daily-progress
export const getDailyProjectProgress = async (req, res) => {
  try {
    // flatten last 90 days entries across projects for feed
    const projects = await Project.find().lean();
    const flat = [];
    projects.forEach((proj) => {
      (proj.dailyProgress || []).forEach((entry) => {
        flat.push({
          _id: entry._id,
          projectId: proj._id,
          projectName: proj.projectName,
          progress: entry.progress,
          note: entry.note,
          date: entry.date,
          workerId: entry.workerId || null,
          latitude: entry.latitude || null,
          longitude: entry.longitude || null,
        });
      });
    });

    // sort descending by date
    flat.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: flat });
  } catch (err) {
    console.error("Error fetching daily project progress:", err);
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
};

// GET /api/project-progress/test-auto-save  -> trigger server-side save (for manual tests)
// controllers/projectProgressController.js
export const triggerAutoSave = async (req, res) => {
  try {
    const mod = await import("../cronJobs/dailyProjectProgressRunOnce.js");
    const runOnce = mod.runOnce || (mod.default && mod.default.runOnce);
    if (!runOnce) {
      return res.status(500).json({ success: false, message: "Auto-save runner not available" });
    }

    const result = await runOnce();
    return res.json({ success: true, message: "Auto-save executed", result });
  } catch (err) {
    // Verbose debug output
    console.error("❌ triggerAutoSave error:", err);
    return res.status(500).json({
      success: false,
      message: "Auto-save failed (debug output enabled)",
      error: String(err.message || err),
      stack: err.stack ? err.stack.split("\n").slice(0, 10).join("\n") : undefined, // first 10 lines
    });
  }
};

