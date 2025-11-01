// backend/controllers/ProjectController.js
import ProjectModel from "../models/ProjectModel.js";
import WorkerModel from "../models/WorkerModel.js";
import mongoose from "mongoose";

/**
 * Create new project (handles multiple images + single pdf)
 * Expectation: route uses upload.fields([
 *   { name: "images", maxCount: 10 },
 *   { name: "pdf", maxCount: 1 }
 * ])
 */
export const newProject = async (req, res) => {
  try {
    const {
      projectName,
      projectDescription,
      projectbudget,
      projectStatus,
      supervisors,
    } = req.body;

    const project = new ProjectModel({
      projectName,
      projectDescription,
      projectbudget,
      projectStatus,
      supervisors: JSON.parse(supervisors || "[]"),
      images: req.files.images ? req.files.images.map(f => f.filename) : [],
      pdfs: req.files.pdfs ? req.files.pdfs.map(f => f.filename) : [],
    });

    await project.save();
    res.status(201).json({ success: true, project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};



/**
 * Return all projects
 */
export const allProjects = async (req, res) => {
  try {
    // Optionally you can populate worker refs if you store refs
    const projects = await ProjectModel.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch projects" });
  }
};

/**
 * Assign a worker to a project
 * Expects: { projectId, workerId } in req.body
 */
export const assignWorker = async (req, res) => {
  try {
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { projectId } = req.params;
    const { workerId } = req.body;

    if (!projectId || !workerId) 
      return res.status(400).json({ success: false, message: "projectId and workerId required" });

    const worker = await WorkerModel.findById(workerId).lean();
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found" });

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (!Array.isArray(project.assignedWorkers)) project.assignedWorkers = [];

    const alreadyAssigned = project.assignedWorkers.some(
      (w) => w.workerId.toString() === workerId
    );

    if (!alreadyAssigned) {
      project.assignedWorkers.push({
        workerId: worker._id,
        name: worker.Name || "Unnamed",
      });
      await project.save();
    }

    return res.status(200).json({ success: true, project });
  } catch (error) {
    console.error("Error in assignWorker:", error);
    return res.status(500).json({ success: false, message: "Failed to assign worker" });
  }
};



/**
 * Toggle or set project status
 * Input variations supported:
 *  - { projectId } -> toggles hold <-> active
 *  - { projectId, status } -> sets to provided status (active|hold|completed)
 */
export const updateStatus = async (req, res) => {
  try {
    const { projectId, status } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: "projectId required" });

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (status && ["active", "completed", "hold"].includes(status)) {
      project.projectStatus = status;
    } else {
      // toggle between hold and active (if completed remains completed)
      if (project.projectStatus === "hold") project.projectStatus = "active";
      else if (project.projectStatus === "active") project.projectStatus = "hold";
    }

    await project.save();
    return res.status(200).json({ success: true, project });
  } catch (error) {
    console.error("Error in updateStatus:", error);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

/**
 * Update progress and optionally upload images
 * Route should use: upload.array("images") or upload.fields([...])
 * Expects form-data with fields: id (project id), progress (number), images (files)
 */
// controllers/projectController.js

export const updateProgress = async (req, res) => {
  try {
    // Accept token in either Authorization header or token header if you use that pattern
    const authHeader = req.headers?.authorization || req.headers?.token || "";
    // (Optional) validate token here if you need to authorize the request

    // parse input
    const id = req.body?.id || req.body?.projectId || null;
    const rawProgress = req.body?.progress;

    if (!id) {
      return res.status(400).json({ success: false, message: "Project ID required (field: id)" });
    }

    const project = await ProjectModel.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const prevStatus = project.projectStatus;

    // Ensure arrays exist
    project.images = Array.isArray(project.images) ? project.images : [];
    project.pdfs = Array.isArray(project.pdfs) ? project.pdfs : [];

    // Normalize uploaded files from multer (support many shapes)
    let allFiles = [];
    if (Array.isArray(req.files)) {
      allFiles = req.files;
    } else if (req.files && typeof req.files === "object") {
      // req.files could be an object with field names -> arrays
      allFiles = Object.values(req.files).flat();
    }

    // Accept files passed in `req.body.files` if your client encoded differently (rare)
    // but primary support is multer req.files
    const imageNames = [];
    const pdfNames = [];

    allFiles.forEach((f) => {
      if (!f || !f.mimetype) return;
      // f.filename is what multer stores after you configured storage.filename
      const filename = f.filename || f.originalname || f.name;
      if (f.mimetype.startsWith("image/")) imageNames.push(filename);
      else if (f.mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) pdfNames.push(filename);
      else {
        // Unknown type -> keep in images by default
        imageNames.push(filename);
      }
    });

    // Append new file names (avoid duplicates)
    if (imageNames.length > 0) {
      project.images = Array.from(new Set([...(project.images || []), ...imageNames]));
    }
    if (pdfNames.length > 0) {
      project.pdfs = Array.from(new Set([...(project.pdfs || []), ...pdfNames]));
    }

    // Update numeric progress if provided
    if (typeof rawProgress !== "undefined" && rawProgress !== null && rawProgress !== "") {
      const numeric = Number(rawProgress);
      if (!Number.isNaN(numeric)) {
        project.progress = Math.min(100, Math.max(0, Math.round(numeric)));
      }
    }

    // If it reaches 100 -> mark completed (and increment worker counters once)
    if (project.progress === 100) {
      project.projectStatus = "completed";

      if (prevStatus !== "completed" && Array.isArray(project.assignedWorkers) && project.assignedWorkers.length) {
        // Normalize assignedWorkers to IDs
        const workerIds = project.assignedWorkers
          .map((w) => {
            if (!w) return null;
            if (typeof w === "object") return w.workerId || w.id || w._id || null;
            return w;
          })
          .filter(Boolean);

        const normalized = workerIds.map((wid) => {
          try {
            return mongoose.Types.ObjectId(wid);
          } catch {
            return wid;
          }
        });

        try {
          const updateResult = await WorkerModel.updateMany(
            { _id: { $in: normalized } },
            { $inc: { completedProjects: 1 } }
          );
          console.log("Worker counters updated:", updateResult);
        } catch (err) {
          console.error("Failed to increment worker counters:", err);
        }
      }

      // Optionally clear assignedWorkers/supervisors if you want
      // project.assignedWorkers = [];
      // project.supervisors = "";
    }

    await project.save();

    return res.status(200).json({ success: true, project });
  } catch (error) {
    console.error("Error in updateProgress:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};




/**
 * Add a new task to a project
 * Expects: { projectId, title, description }
 */
// controllers/ProjectController.js
export const addTask = async (req, res) => {
  const { projectId, title, description } = req.body;
  if (!projectId || !title) return res.status(400).json({ message: "Missing projectId or title" });

  try {
    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const newTask = { title, description, milestones: [] };
    project.tasks = project.tasks ? [...project.tasks, newTask] : [newTask];
    await project.save();

    res.json({ success: true, project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Add a milestone to a specific task
 * Expects: { projectId, taskId, title }
 */
export const addMilestone = async (req, res) => {
  try {
    const { projectId, taskId, title } = req.body;

    if (!projectId || !taskId || !title) {
      return res.status(400).json({ success: false, message: "Project ID, Task ID, and milestone title required" });
    }

    const project = await ProjectModel.findById(projectId);
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    // ✅ Add the new milestone
    task.milestones.push({ title, completed: false });

    // ✅ Since a new milestone is added, mark task as incomplete again
    task.completed = false;
    task.completedAt = null;

    await project.save();

    return res.status(201).json({ success: true, project });
  } catch (error) {
    console.error("💥 Error in addMilestone:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add milestone",
      error: error.message,
    });
  }
};


export const assignWorkerToTask = async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const { workerId } = req.body;

    console.log("Request body:", req.body);

    if (!projectId || !taskId || !workerId) {
      return res.status(400).json({
        success: false,
        message: "projectId, taskId, and workerId are required",
      });
    }

    // ✅ Find project
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // ✅ Find task inside project
    const task = project.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // ✅ Ensure array exists
    if (!Array.isArray(task.assignedWorkers)) task.assignedWorkers = [];

    // ✅ Store workerId
    if (!task.assignedWorkers.includes(workerId)) {
      task.assignedWorkers.push(workerId);
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Worker assigned to task successfully",
      task,
    });
  } catch (error) {
    console.error("Error in assignWorkerToTask:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign worker to task",
      error: error.message,
    });
  }
};





/**
 * Update milestone completion and recalculate progress
 * Expects: { projectId, taskId, milestoneId, isCompleted }
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { projectId, taskId, completed } = req.body;

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.completed = completed;
    task.completedAt = completed ? new Date() : null; // ✅ store date if completed

    await project.save();
    res.json({ updatedProject: project });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ message: "Failed to update task" });
  }
};


// POST /api/update-milestone-status
export const updateMilestoneStatus = async (req, res) => {
  try {
    const { projectId, taskId, milestoneId, completed, completedAt } = req.body;

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const milestone = task.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found" });

    milestone.completed = completed;
    milestone.completedAt = completed ? completedAt || new Date() : null;

    // ✅ Check if all milestones are completed
    const allCompleted = task.milestones.every((m) => m.completed);

    if (allCompleted) {
      task.completed = true;
      // Set task completion time as the latest milestone completion
      const latestMilestone = task.milestones.reduce((a, b) =>
        new Date(a.completedAt) > new Date(b.completedAt) ? a : b
      );
      task.completedAt = latestMilestone.completedAt || new Date();
    } else {
      task.completed = false;
      task.completedAt = null;
    }

    await project.save();

    res.json({ success: true, updatedProject: project });
  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// PUT /api/project/:projectId/task/:taskId/complete
export const markTaskComplete = async (req, res) => {
  const { projectId, taskId } = req.params;
  const { completedAt } = req.body;

  try {
    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.completedAt = completedAt ? new Date(completedAt) : new Date();
    task.completed = true;

    await project.save();

    return res.status(200).json({ success: true, project });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};




// Delete a task
export const deleteTask = async (req, res) => {
  try {
    const { projectId, taskId } = req.body;
    if (!projectId || !taskId) return res.status(400).json({ message: "Project ID and Task ID required" });

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.tasks.id(taskId).remove();
    await project.save();
    res.json({ success: true, project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete task" });
  }
};

// Delete a milestone
export const deleteMilestone = async (req, res) => {
  try {
    const { projectId, taskId, milestoneId } = req.body;
    if (!projectId || !taskId || !milestoneId) return res.status(400).json({ message: "All IDs required" });

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.milestones.id(milestoneId).remove();

    // Recalculate task progress
    const total = task.milestones.length;
    const done = task.milestones.filter(m => m.isCompleted).length;
    task.progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // Recalculate project progress
    const allTasks = project.tasks;
    project.progress = allTasks.length > 0 ? Math.round(allTasks.reduce((a,t)=>a+t.progress,0)/allTasks.length) : 0;

    await project.save();
    res.json({ success: true, project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete milestone" });
  }
};


export const updateProjectProgress = async (req, res) => {
  try {
    const { projectId, progress } = req.body;

    if (!projectId || progress === undefined) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Convert progress safely
    const numericProgress = Math.min(100, Math.max(0, Number(progress)));
    project.progress = numericProgress;

    // --- ✅ If project is completed ---
    if (numericProgress === 100) {
      project.projectStatus = "completed";

      // Only increment once per project
      if (!project.isCountedForCompletion && Array.isArray(project.assignedWorkers) && project.assignedWorkers.length > 0) {
        const workerIds = project.assignedWorkers
          .map((w) => (typeof w === "object" ? w.workerId || w.id || w._id : w))
          .filter(Boolean)
          .map((id) => new mongoose.Types.ObjectId(id));

        const updateResult = await WorkerModel.updateMany(
          { _id: { $in: workerIds } },
          { $inc: { completedProjects: 1 } }
        );

        console.log("✅ Worker counters updated:", updateResult);
        project.isCountedForCompletion = true;
      }
    } else {
      // Revert project if progress < 100
      project.projectStatus = "active";
      project.isCountedForCompletion = false;
      // ❌ Do NOT clear assignedWorkers here
    }

    await project.save();
    res.json({ success: true, project });

  } catch (error) {
    console.error("❌ Error updating project progress:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateClosingBudget = async (req, res) => {
  try {
    const { projectId, closingBudget } = req.body;

    if (!projectId || closingBudget === undefined) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.progress < 100) {
      return res
        .status(400)
        .json({ success: false, message: "Project must reach 100% to submit closing budget" });
    }

    project.closingBudget = closingBudget;
    await project.save();

    return res.json({ success: true, message: "Closing budget saved", project });
  } catch (error) {
    console.error("Error updating closing budget:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
