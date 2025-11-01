import cron from "node-cron";
import Project from "../models/ProjectModel.js";
import ProjectProgress from "../models/ProjectProgress.js";

// 🔁 reusable function (can be used by cron & manual route)
export const runDailySaveNow = async () => {
  console.log("🕛 Running daily project progress save...");
  try {
    const projects = await Project.find({});
    if (!projects.length) {
      console.log("No projects found to save.");
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    for (const p of projects) {
      const alreadySaved = await ProjectProgress.findOne({
        projectId: p._id,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (!alreadySaved) {
        await ProjectProgress.create({
          projectId: p._id,
          projectName: p.projectName || p.name || "Unnamed Project",
          progress: p.progress ?? 0,
          note: "Auto-saved daily progress",
          date: new Date(),
        });
        console.log(`✅ Saved progress for ${p.projectName}: ${p.progress}%`);
      } else {
        console.log(`⏩ Already saved for ${p.projectName}`);
      }
    }

    console.log("🌙 Daily save completed!");
  } catch (err) {
    console.error("❌ Auto-save failed:", err);
  }
};

// 🕛 schedule to run daily at 11:59 PM
export const autoSaveProjectProgress = () => {
  cron.schedule("59 23 * * *", async () => {
    console.log("⏰ Scheduled auto-save triggered");
    await runDailySaveNow();
  });
};
