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
router.post("/delete-milestone", deleteMilestone);

/* ------------------ Update Progress ------------------ */
router.post("/update-progress", upload.array("files", 30), updateProgress);

// Manual progress update (no file uploads)
router.post("/update-progresses", async (req, res) => {
  try {
    const { id, progress } = req.body;
    const project = await ProjectModel.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.progress = progress;
    await project.save();
    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

export default router;