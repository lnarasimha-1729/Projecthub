import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";
import { useContext } from "react";
import { UsersContext } from "../Context/UserContext";

export default function Team_Allocation({ projects }) {
  const safeProjects = Array.isArray(projects) ? projects : [];

  if (safeProjects.length === 0) {
    return (
      <div className="w-1/2 h-[410px] rounded-lg bg-white shadow-md p-4 flex items-center justify-center text-gray-500">
        No project data available
      </div>
    );
  }

  const data = {
    labels: safeProjects.map((item) =>
      item.projectName.length > 15
        ? item.projectName.match(/.{1,10}/g) // 👈 breaks long names into multiple lines
        : [item.projectName]
    ),
    datasets: [
      {
        label: "Number of Assigned Workers",
        data: safeProjects.map((item) => item.assignedWorkers?.length || 0),
        backgroundColor: "#3b82f6",
        borderRadius: 6,
        barThickness: 30,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Team Allocation per Project",
        font: { size: 14 },
        color: "#000",
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { display: false },
        title: {
          display: true,
          text: "Number of Workers",
          color: "#000",
          font: { size: 14, weight: "bold" },
        },
        ticks: {
          color: "#000",
          font: { size: 12 },
        },
      },
      y: {
        grid: { display: false },
        title: {
          display: true,
          text: "Projects",
          color: "#000",
          font: { size: 14, weight: "bold" },
        },
        ticks: {
          color: "#000",
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="lg:w-1/2 md:w-full mt-0 h-[410px] rounded-lg bg-white shadow-sm p-4 overflow-x-auto">
      <Bar data={data} options={options} />
    </div>
  );
}
