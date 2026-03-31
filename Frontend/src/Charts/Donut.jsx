import React from "react";
import "react-toastify/dist/ReactToastify.css";
import { Chart as ChartJS } from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ChartDataLabels);

const Donut = ({ active = [], onHold = [] }) => {
  
  const total = active.length + onHold.length;
  const activePercentage = total === 0 ? 0 : ((active.length / total) * 100).toFixed(1);
  const onHoldPercentage = total === 0 ? 0 : ((onHold.length / total) * 100).toFixed(1);

  const data = {
    labels: ["On-Hold Projects", "Active Projects"],
    datasets: [
      {
        label: "Projects",
        data: [onHoldPercentage, activePercentage],
        backgroundColor: ["#28a745", "#3b82f7"],
        borderWidth: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: true },
        position: "bottom",
        labels: {
          color: "#374151",
          font: { size: 13, weight: "bold" },
        },
        title : {
          display: true,
          text: 'Project Status Distribution',
          color: '#111827',
          font: { size: 14, weight: 'bold' },
          padding: { top: 10, bottom: 20 }
        },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || "";
            const value = label === "On-Hold Projects" ? onHold.length : active.length;
            return `${label}: ${value}`;
          },
        },
      },
      datalabels: {
        color: "#fff",
        font: { weight: "bold", size: 14 },
        formatter: (value) => `${value}%`,
      },
    },
  };

  return (
    <div className="lg:w-1/2 md:w-full max-[639px]:w-full mt-0 h-[410px] bg-white rounded-xl shadow-sm p-2 flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default Donut;