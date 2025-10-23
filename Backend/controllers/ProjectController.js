// backend/controllers/ProjectController.js
import ProjectModel from "../models/ProjectModel.js";
import WorkerModel from "../models/WorkerModel.js";

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
    console.log("🟢 updateProgress called");
    console.log("REQ.BODY:", req.body);
    console.log("REQ.FILES:", req.files);

    const { id, progress } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Project ID required" });

    const project = await ProjectModel.findById(id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Ensure arrays exist
    project.images = Array.isArray(project.images) ? project.images : [];
    project.pdfs = Array.isArray(project.pdfs) ? project.pdfs : [];

    // Normalize uploaded files from multer
    let allFiles = [];
    if (Array.isArray(req.files)) {
      allFiles = req.files;
    } else if (req.files && typeof req.files === "object") {
      // Flatten if multiple fields like req.files.images / req.files.pdf
      allFiles = Object.values(req.files).flat();
    }

    console.log("✅ All uploaded files:", allFiles.map(f => ({ name: f.filename, mime: f.mimetype })));

    // Separate images & pdfs
    allFiles.forEach(f => {
      if (!f || !f.mimetype) return;
      if (f.mimetype.startsWith("image/")) project.images.push(f.filename);
      else if (f.mimetype === "application/pdf") project.pdfs.push(f.filename);
    });

    // Update progress
    if (progress !== undefined) {
      const numeric = Number(progress);

      if (!Number.isNaN(numeric)) project.progress = Math.min(100, Math.max(0, numeric));

      if(numeric === 100){
        project.projectStatus = "completed";
        project.assignedWorkers = []
        project.supervisors = ""
      }
    }

    await project.save();

    console.log("🟢 Updated project:", project);

    return res.status(200).json({ success: true, project });
  } catch (error) {
    console.error("❌ Error in updateProgress:", error);
    return res.status(500).json({ success: false, message: error.message });
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
    console.log("📩 Request body:", req.body);

    const { projectId, taskId, title } = req.body;

    if (!projectId || !taskId || !title) {
      console.log("❌ Missing fields:", { projectId, taskId, title });
      return res
        .status(400)
        .json({ success: false, message: "Project ID, Task ID, and milestone title required" });
    }

    const project = await ProjectModel.findById(projectId);
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    console.log("✅ Before adding milestone:", task.milestones);

    task.milestones.push({ title });

    await project.save();

    console.log("✅ Milestone added successfully!");

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


export const updateMilestoneStatus = async (req, res) => {
  try {
    const { projectId, taskId, milestoneId, completed, completedAt } = req.body;
    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const milestone = task.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });

    milestone.completed = completed;

    milestone.completedAt = completed ? (completedAt ? new Date(completedAt) : new Date()) : null;

    // Automatically mark task complete if all milestones done
    task.completed = task.milestones.every((m) => m.completed);

    await project.save();
    res.json({ updatedProject: project });
  } catch (err) {
    res.status(500).json({ message: err.message });
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


