import React, { useContext, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UsersContext } from "../Context/UserContext";

export default function ProjectProgressChart() {
  const { getDailyProgress } = useContext(UsersContext);

  const progressArray = Array.isArray(getDailyProgress)
    ? getDailyProgress
    : [];

  const toYYYYMMDD = (d) => {
    const dt = new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const last7Dates = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      arr.push(toYYYYMMDD(d));
    }
    return arr;
  }, []);

  const chartData = useMemo(() => {
    const map = {};
    last7Dates.forEach((date) => {
      map[date] = { date };
    });

    progressArray.forEach((projectEntry) => {
      const projectName =
        projectEntry.projectName || projectEntry.projectId || "unknown";

      const dates = Array.isArray(projectEntry.dates)
        ? projectEntry.dates
        : [];
      const progresses = Array.isArray(projectEntry.progresses)
        ? projectEntry.progresses
        : [];

      dates.forEach((dateStr, idx) => {
        if (!dateStr) return;
        const normalized =
          dateStr.length >= 10 ? dateStr.slice(0, 10) : toYYYYMMDD(dateStr);

        if (map[normalized]) {
          const rawProgress = progresses?.[idx];
          const progressValue =
            rawProgress === null ||
            rawProgress === undefined ||
            rawProgress === ""
              ? null
              : Number(rawProgress);

          map[normalized][projectName] = Number.isFinite(progressValue)
            ? progressValue
            : null;
        }
      });
    });

    return last7Dates.map((d) => map[d]);
  }, [progressArray, last7Dates]);

  const projectNames = useMemo(() => {
    const set = new Set();
    progressArray.forEach((p) => {
      if (p.projectName) set.add(p.projectName);
    });
    return Array.from(set);
  }, [progressArray]);

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

  const tickFormatter = (dateStr) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // 📱💻 RESPONSIVE AXIS SETTINGS
  const screenWidth = window.innerWidth;

  let xTickSize = 12;
  let yTickSize = 12;
  let xInterval = 0; // show all ticks by default

  if (screenWidth < 640) {
    // Mobile
    xTickSize = 10;
    yTickSize = 10;
    xInterval = 1; // show alternate ticks for readability
  } else if (screenWidth < 1024) {
    // Tablet
    xTickSize = 14;
    yTickSize = 14;
    xInterval = 0;
  } else {
    // Desktop
    xTickSize = 14;
    yTickSize = 14;
    xInterval = 0;
  }

  return (
    <div
      className="
        bg-white 
        rounded-2xl 
        shadow-md 
        overflow-hidden 
        w-full
        border-2
        border-purple-200
        p-1 max-[639px]:p-6 md:p-8 lg:p-10
        max-[639px]:h-[350px] md:h-[400px] lg:h-[480px]
      "
    >
      <p className="lg:text-base md:text-lg max-[639px]:md font-semibold mb-4 text-gray-700 text-center">
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
            margin={{ top: 10, right: 20, left: -20, bottom: 50 }}
            padding={{ bottom: 20 }}
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

            {/* ✅ Responsive X Axis */}
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fontSize: xTickSize }}
              interval={0}
            />

            {/* ✅ Responsive Y Axis */}
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: yTickSize }}
            />

            <Tooltip
  contentStyle={{
    maxWidth: window.innerWidth < 480 ? "130px" : window.innerWidth < 768 ? "160px" : "220px",
    maxHeight: window.innerWidth < 480 ? "100px" : "300px",
    overflowY: "auto",                // prevents overflow
    padding: window.innerWidth < 480 ? "4px 6px" : "8px 10px",
    fontSize: window.innerWidth < 480 ? "10px" : "12px",
    borderRadius: "8px",
    whiteSpace: "normal",
    wordBreak: "break-word",
    boxSizing: "border-box",
  }}
  itemStyle={{
    fontSize: window.innerWidth < 480 ? "10px" : "12px",
    lineHeight: window.innerWidth < 480 ? "14px" : "16px",
    whiteSpace: "normal",
    wordBreak: "break-word",
  }}
  labelStyle={{
    fontSize: window.innerWidth < 480 ? "11px" : "13px",
    fontWeight: "600",
    marginBottom: "4px",
    whiteSpace: "normal",
    wordBreak: "break-word",
  }}
/>



            {projectNames.map((project, index) => (
              <Area
                key={project}
                type="monotone"
                dataKey={project}
                stroke={colors[index % colors.length]}
                fillOpacity={1}
                fill={`url(#color${project})`}
                name={project}
                connectNulls={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
