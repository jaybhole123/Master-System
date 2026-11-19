import type React from 'react';

interface HorizontalBarChartProps {
  data: number[];
  labels: string[];
  colors: string[];
  maxValue: number;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  labels,
  colors,
  maxValue,
}) => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Scrollable Body */}
      <div className="horizontal-chart-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="py-2">
          <div className="space-y-3">
            {data.map((value, index) => (
              <div key={index} className="flex items-center space-x-3 px-1">
                {/* Label – Flexible width to show full names */}
                <div
                  className="mr-3 shrink-0 text-sm font-medium text-gray-700"
                  style={{ minWidth: '150px', maxWidth: '40%' }}
                  title={labels[index]}
                >
                  {labels[index]}
                </div>

                {/* Bar Container */}
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-gray-200 md:h-6">
                  <div
                    className="h-full rounded-full shadow-xs transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min((value / maxValue) * 100, 100)}%`,
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                </div>

                {/* Value */}
                <div className="w-12 shrink-0 text-right">
                  <span className="text-sm font-bold text-gray-800">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .horizontal-chart-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .horizontal-chart-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .horizontal-chart-scroll::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        .horizontal-chart-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default HorizontalBarChart;
