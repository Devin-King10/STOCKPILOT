import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KPICard
 * @param {React.ReactNode|React.ComponentType} icon - Lucide icon element or component
 * @param {string|number} value - Main metric value
 * @param {string} label - Descriptive label
 * @param {number} [trend] - Percentage change (positive = up, negative = down, 0 = neutral)
 * @param {string} [trendLabel] - e.g. "vs last week"
 * @param {string} [accentColor] - Tailwind bg color class for icon bg, e.g. 'bg-blue-100'
 * @param {string} [iconColor] - Tailwind text color class for icon, e.g. 'text-blue-600'
 * @param {string} [className] - Additional class names
 */
export default function KPICard({
  icon,
  value,
  label,
  trend,
  trendLabel = 'vs last period',
  accentColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  className = '',
}) {
  const hasTrend = trend !== undefined && trend !== null;

  const trendInfo = (() => {
    if (!hasTrend) return null;
    if (trend > 0)
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        bg: 'bg-green-50',
        sign: '+',
      };
    if (trend < 0)
      return {
        icon: TrendingDown,
        color: 'text-red-500',
        bg: 'bg-red-50',
        sign: '',
      };
    return {
      icon: Minus,
      color: 'text-gray-500',
      bg: 'bg-gray-50',
      sign: '',
    };
  })();

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComp = icon;
      return <IconComp className="w-5 h-5" />;
    }
    return icon;
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex items-center justify-center w-11 h-11 rounded-xl ${accentColor}`}
        >
          <span className={`${iconColor}`}>{renderIcon()}</span>
        </div>

        {hasTrend && trendInfo && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trendInfo.color} ${trendInfo.bg}`}
          >
            <trendInfo.icon className="w-3 h-3" />
            {trendInfo.sign}{Math.abs(trend)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>

      {hasTrend && trendLabel && (
        <p className="text-xs text-gray-400">{trendLabel}</p>
      )}
    </div>
  );
}
