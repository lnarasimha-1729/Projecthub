import express from "express";
import {
  newProject,
  allProjects,
  assignWorker,
  updateStatus,
  updateProgress,
  addTask,
  addMilestone,
  updateMilestoneStatus,
  updateTaskStatus,
  deleteTask,
  deleteMilestone,
  markTaskComplete,
  assignWorkerToTask,
  updateProjectProgress,
  updateClosingBudget
} from "../controllers/ProjectController.js";
import { upload } from "../middleware/update.js";
import verifyToken from "../middleware/Auth.js";

const router = express.Router();

/* ------------------ Project Creation ------------------ */
// ✅ Single, consistent route (uses `pdfs` and matches controller/schema)
router.post(
  "/new",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "pdfs", maxCount: 5 },
  ]),
  newProject
);

/* ------------------ Projects ------------------ */
router.get("/get-projects", allProjects);
router.put("/projects/:projectId/assign", assignWorker);
router.post("/update-status", updateStatus);

/* ------------------ Tasks & Milestones ------------------ */
router.post("/add-task", verifyToken, addTask);
router.post("/add-milestone", addMilestone);
router.post("/update-milestone", updateMilestoneStatus);
router.post("/update-task-status", verifyToken, updateTaskStatus);
router.post("/update-milestone-status", verifyToken, updateMilestoneStatus);
router.post("/delete-task", deleteTask);
router.put("/:projectId/task/:taskId/complete", markTaskComplete);
router.post("/delete-milestone", deleteMilestone);
router.post("/update-project-progress", updateProjectProgress);

/* ------------------ Update Progress ------------------ */
router.post("/update-progress", upload.array("files", 30), updateProgress);
router.put("/:projectId/task/:taskId/assign", assignWorkerToTask);
router.post("/update-closing-budget", updateClosingBudget);



export default router;