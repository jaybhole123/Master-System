import { type LucideIcon, TrendingUp } from 'lucide-react';
import type React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'amber';
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon = TrendingUp,
  color = 'blue',
  trend,
}) => {
  const colorClasses = {
    blue: {
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      gradient: 'from-blue-50 to-blue-100',
    },
    green: {
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      gradient: 'from-green-50 to-green-100',
    },
    orange: {
      border: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconText: 'text-orange-600',
      gradient: 'from-orange-50 to-orange-100',
    },
    purple: {
      border: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      gradient: 'from-purple-50 to-purple-100',
    },
    amber: {
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      gradient: 'from-amber-50 to-amber-100',
    },
  };

  const currentColor = colorClasses[color] || colorClasses.blue;

  return (
    <div
      className={`bg-linear-to-br ${currentColor.gradient} rounded-xl border p-4 sm:p-6 ${currentColor.border} group shadow-xs transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center">
          <div
            className={`rounded-full p-2 sm:p-3 ${currentColor.iconBg} mr-3 transition-transform duration-200 group-hover:scale-110 sm:mr-4`}
          >
            {Icon && <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${currentColor.iconText}`} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-600 sm:text-sm">{title}</p>
            <h4 className="mt-1 truncate text-lg font-bold text-gray-800 sm:text-2xl">{value}</h4>
          </div>
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center sm:mt-4">
          <span
            className={`flex items-center text-xs font-medium sm:text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}%
          </span>
          <span className="ml-2 truncate text-xs text-gray-500 sm:text-sm">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
