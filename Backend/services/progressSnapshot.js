// services/progressSnapshot.js
import Project from "../models/ProjectModel.js"
import ProjectDailyProgress from '../models/ProjectDailyProgress.js'
import getISTDateString from '../utils/ist.js'

async function snapshotAllProjects() {
  const today = getISTDateString(); // 'YYYY-MM-DD'
  const projects = await Project.find({}).lean();

  // iterate through projects and upsert snapshot
  const results = { updated: 0, created: 0, skipped: 0, errors: [] };

  for (const p of projects) {
    try {
      // determine progress number (change if your field name differs)
      const progressValue = typeof p.progress === 'number' ? p.progress : Number(p.progress) || 0;

      const existing = await ProjectDailyProgress.findOne({ projectId: p._id });

      if (!existing) {
        // create new doc for project
        await ProjectDailyProgress.create({
          projectId: p._id,
          projectName: p.projectName || '',
          dates: [today],
          progresses: [progressValue],
        });
        results.created++;
      } else {
        const lastDate = existing.dates.length ? existing.dates[existing.dates.length - 1] : null;

        if (lastDate === today) {
          // already recorded today -> skip (or update latest progress if you prefer)
          results.skipped++;
        } else {
          // push today's date and progress (keeps previous history)
          existing.dates.push(today);
          existing.progresses.push(progressValue);
          await existing.save();
          results.updated++;
        }
      }
    } catch (err) {
      results.errors.push({ projectId: p._id, message: err.message });
      console.error('Error snapshotting project', p._id, err);
    }
  }

  return results;
}
export default snapshotAllProjects ;
