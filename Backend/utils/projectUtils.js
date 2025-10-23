// backend/utils/projectUtils.js
export const calculateProjectProgress = (project) => {
  let totalMilestones = 0;
  let completedMilestones = 0;

  project.tasks.forEach(task => {
    task.milestones.forEach(ms => {
      totalMilestones++;
      if (ms.completed) completedMilestones++;
    });
  });

  return totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);
};