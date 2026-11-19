'use client';

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import type React from 'react';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  data: number[];
  labels: string[];
  colors?: string[];
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  labels,
  colors = ['#10b981', '#3b82f6', '#f59e0b'],
}) => {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderColor: colors.map(() => '#ffffff'),
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
    },
    cutout: '65%',
  };

  return (
    <div className="h-64">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default DoughnutChart;
