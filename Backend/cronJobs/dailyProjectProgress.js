// cron/dailyProjectProgress.js
import cron from "node-cron";
import mongoose from "mongoose";
import Project from "../models/ProjectModel.js";

/**
 * Atomic daily saver:
 * - For each project it issues an updateOne filter that only matches if
 *   no dailyProgress entry exists for today's date (prevents dupes).
 * - Uses $push to append the entry atomically.
 * - Logs matchedCount/modifiedCount and does a raw collection check.
 */
export async function saveDailyProgress() {
  console.log("🕛 Running daily project progress save (ATOMIC MODE) ...");

  try {
    // connection diagnostics
    console.log("✅ mongoose.connection.readyState:", mongoose.connection.readyState);
    try {
      const db = mongoose.connection.db;
      console.log("✅ mongoose DB name:", db.databaseName);
    } catch (e) {
      console.warn("⚠️ Could not read mongoose.connection.db details:", e.message || e);
    }

    const projects = await Project.find({}, { projectName: 1, progress: 1 }).lean();
    console.log("Found projects count:", projects.length);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const summary = { attempted: 0, pushed: 0, skipped: 0, errors: [] };

    for (const p of projects) {
      summary.attempted++;
      try {
        const progressVal = typeof p.progress === "number" ? p.progress : Number(p.progress || 0);

        // Filter: match this project AND ensure no dailyProgress entry exists for today
        const filter = {
          _id: p._id,
          dailyProgress: { $not: { $elemMatch: { date: { $gte: startOfDay, $lte: endOfDay } } } },
        };

        const pushDoc = {
          date: new Date(),
          progress: progressVal,
          note: "Auto-saved daily progress (ATOMIC)",
        };

        const update = { $push: { dailyProgress: pushDoc } };

        // Atomic update call
        const result = await Project.collection.updateOne(filter, update);

        // result has matchedCount and modifiedCount
        // If matchedCount === 0, the filter didn't match -> either project missing or already has today's entry
        if (result.matchedCount === 0) {
          summary.skipped++;
          console.log(`⏭️ Skipped "${p.projectName}" — entry likely exists for today (matchedCount=0).`);
          continue;
        }

        // If matchedCount > 0 and modifiedCount > 0 then push succeeded
        if (result.modifiedCount > 0) {
          summary.pushed++;
          console.log(`✅ Pushed daily entry for "${p.projectName}": ${progressVal}% (matched=${result.matchedCount}, modified=${result.modifiedCount})`);
        } else {
          // matched but modifiedCount 0 (rare) — log it
          console.warn(`⚠️ Matched but not modified for "${p.projectName}" (matched=${result.matchedCount}, modified=${result.modifiedCount})`);
        }

        // verify raw read (immediate read from same DB connection)
        try {
          const raw = await mongoose.connection.db.collection("projects").findOne(
            { _id: p._id },
            { projection: { "dailyProgress": { $slice: -1 } } }
          );
          console.log("🔬 Raw collection last entry:", raw?.dailyProgress?.[0] ?? "none");
        } catch (rawErr) {
          console.warn("⚠️ raw collection check failed:", rawErr.message || rawErr);
        }

      } catch (projErr) {
        summary.errors.push({ projectId: p._id, projectName: p.projectName, error: String(projErr.message || projErr) });
        console.error(`❌ Error for project ${p.projectName}:`, projErr);
      }
    }

    console.log("🌙 Daily save completed! (ATOMIC)");
    console.log("SUMMARY:", summary);
    return summary;
  } catch (err) {
    console.error("❌ Fatal error running saveDailyProgress (ATOMIC):", err);
    throw err;
  }
}

// schedule daily job (same as before)
cron.schedule("59 23 * * *", () => {
  saveDailyProgress().catch((e) => console.error("Cron job failed:", e));
});

export default saveDailyProgress;
