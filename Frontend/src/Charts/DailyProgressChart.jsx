import React, { useContext, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import dayjs from "dayjs";
import { UsersContext } from "../Context/UserContext";

const DailyProgressChart = () => {
  const [data, setData] = useState([]);

  const {backendUrl} = useContext(UsersContext)

  useEffect(() => {
    // Fetch daily progress data from backend
    const fetchData = async () => {
      try {
        const res = await axios.get(backendUrl + "/api/daily-progress");
        const formatted = res.data.map((item) => ({
          projectName: item.projectName,
          progress: item.progress,
          date: dayjs(item.date).format("YYYY-MM-DD"), // Format for x-axis
        }));
        setData(formatted);
      } catch (error) {
        console.error("Error fetching daily progress:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full h-[400px] bg-white shadow-lg rounded-2xl p-8">
      <h2 className="text-lg font-semibold text-center mb-4">
        Daily Project Progress
      </h2>
      <ResponsiveContainer width="100%" height="100%">
  <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis
      dataKey="date"
      tick={{ fontSize: window.innerWidth < 640 ? 8 : 12 }}
      angle={-20}
      textAnchor="end"
    />

    <YAxis
      domain={[0, 100]}
      tick={{ fontSize: window.innerWidth < 640 ? 8 : 12 }}
    />

    <Tooltip contentStyle={{ fontSize: window.innerWidth < 640 ? 10 : 12 }} />
    <Legend wrapperStyle={{ fontSize: window.innerWidth < 640 ? 10 : 12 }} />

    <Line
      type="monotone"
      dataKey="progress"
      stroke="#6366f1"
      strokeWidth={3}
      dot={{ r: window.innerWidth < 640 ? 2 : 4 }}
      activeDot={{ r: window.innerWidth < 640 ? 4 : 6 }}
    />
  </LineChart>
</ResponsiveContainer>

    </div>
  );
};

export default DailyProgressChart;
