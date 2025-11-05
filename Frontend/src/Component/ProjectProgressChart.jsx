import React, { useContext, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { UsersContext } from "../Context/UserContext";

export default function ProjectProgressChart() {

    const {getDailyProgress} = useContext(UsersContext)
  // Ensure data safety
  const progressArray = Array.isArray(getDailyProgress) ? getDailyProgress : [];

  // Calculate last 7 days range
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  // Group progress by date for each project
  const chartData = useMemo(() => {
    const dataMap = {};

    progressArray.forEach((item) => {
      const date = item.dates?.[0];
      if (!date) return; // skip missing dates

      const project = item.projectName;
      const progress = item.progresses?.[0] || 0;

      if (!dataMap[date]) dataMap[date] = { date };
      dataMap[date][project] = progress;
    });

    // Sort dates
    const sorted = Object.values(dataMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // ✅ If more than 7 days of data, show only last 7
    if (sorted.length > 7) {
      return sorted.slice(sorted.length - 7);
    }

    // ✅ If 7 or fewer days, show all
    return sorted;
  }, [getDailyProgress]);

  // Get unique project names
  const projectNames = [
    ...new Set(progressArray.map((item) => item.projectName)),
  ];

  // Predefined colors (looped if projects > colors)
  const colors = [
    "#ff7300",
    "#387908",
    "#8884d8",
    "#82ca9d",
    "#ff0000",
    "#00bcd4",
    "#ffc658",
    "#8a2be2",
    "#d500f9",
  ];

  return (
    <div className="w-full h-[500px] bg-white p-4 py-8 rounded-2xl shadow-md">
      <p className="text-lg font-semibold mb-4 text-gray-700">
        Activity Last 7 Days
      </p>

      {chartData.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          No progress data available.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              {projectNames.map((project, index) => (
                <linearGradient
                  key={project}
                  id={`color${project}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => new Date(d).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip />
            <Legend />

            {projectNames.map((project, index) => (
              <Area
                key={project}
                type="monotone"
                dataKey={project}
                stroke={colors[index % colors.length]}
                fillOpacity={1}
                fill={`url(#color${project})`}
                name={project}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
