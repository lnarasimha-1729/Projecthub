// cron/dailyProjectProgressRunOnce.js
// Import the named export to be explicit and robust
import { saveDailyProgress } from "./dailyProjectProgress.js";

export const runOnce = async () => {
  // call the same logic used by the cron
  await saveDailyProgress();
};

export default { runOnce };
