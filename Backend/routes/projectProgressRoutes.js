// routes/projectProgressRoutes.js
import express from "express";
import {
  getMonthlyProgress,
  saveProgress,
  deleteProgress,
  getDailyProjectProgress,
  triggerAutoSave,
} from "../controllers/projectProgressController.js";

const router = express.Router();

// GET monthly aggregated entries (query: ?year=2025&month=11)
router.get("/", getMonthlyProgress);

// POST save (or update) single daily progress into project.dailyProgress
router.post("/", saveProgress);

// DELETE a daily entry (requires projectId and entryId in params or body)
router.delete("/:projectId/entry/:entryId", deleteProgress);

// GET flattened daily progress list (for feed)
router.get("/daily-progress", getDailyProjectProgress);

// GET trigger to run auto-save immediately (test endpoint)
router.get("/test-auto-save", triggerAutoSave);

export default router;
