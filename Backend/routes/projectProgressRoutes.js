import express from "express";
import {
  getMonthlyProgress,
  saveProgress,
  deleteProgress,
  getDailyProjectProgress,
} from "../controllers/projectProgressController.js";

const router = express.Router();

router.get("/", getMonthlyProgress);
router.post("/", saveProgress);
router.delete("/:id", deleteProgress);
router.get("/daily-progress", getDailyProjectProgress);

export default router;
