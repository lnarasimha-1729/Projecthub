import React, { useContext } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { UsersContext } from "../Context/UserContext";

const BudgetChart = () => {

    const {projects} = useContext(UsersContext)

    const completedProject = projects.filter((item)=>item.projectStatus === "completed")
  // Transform data
  const chartData = completedProject.map((project) => {
    const budgetSaved =
      project.closingBudget < project.projectbudget
        ? project.projectbudget - project.closingBudget
        : 0;
    const budgetLoss =
      project.closingBudget > project.projectbudget
        ? project.closingBudget - project.projectbudget
        : 0;

    return {
      name: project.projectName,
      ProjectBudget: project.projectbudget,
      ClosingBudget: project.closingBudget,
      BudgetSaved: budgetSaved,
      BudgetLoss: budgetLoss,
    };
  });

  return (
    <div className="w-full h-[400px] bg-white shadow-md p-4 rounded-lg">
      <p className="text-center text-lg font-semibold mb-2">Project Budget Overview</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="ProjectBudget"
            stroke="#f39c12"
            strokeWidth={2}
            dot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="ClosingBudget"
            stroke="#2980b9"
            strokeWidth={2}
            dot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="BudgetSaved"
            stroke="#27ae60"
            strokeWidth={2}
            dot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="BudgetLoss"
            stroke="#e74c3c"
            strokeWidth={2}
            dot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetChart;
