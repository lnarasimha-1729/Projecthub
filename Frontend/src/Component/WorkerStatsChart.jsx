import React, { useContext } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import UserContext, { UsersContext } from "../Context/UserContext";

const WorkerStatsChart = () => {

    const {workers} = useContext(UsersContext)
    const workerlist = workers.filter((item)=>item.workerType === "Worker")
  // ✅ Transform data if needed
  const chartData = workerlist.map((worker) => ({
    name: worker.Name,
    "Total Hours Worked": worker.totalHoursWorked,
    "Completed Projects": worker.completedProjects,
  }));

  return (
    <div className="w-full h-96 bg-white/80 p-6 rounded-2xl shadow-lg">
      <p className="text-lg font-semibold mb-4 text-gray-700 text-center">
        Worker Performance Overview
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "#4B5563" }} />
          <YAxis tick={{ fill: "#4B5563" }} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="Total Hours Worked"
            fill="#60A5FA"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="Completed Projects"
            fill="#34D399"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WorkerStatsChart;
