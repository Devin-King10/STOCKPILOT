import { PackageSearch } from 'lucide-react';

/**
 * EmptyState
 * @param {React.ReactNode} [icon] - Custom icon element; defaults to PackageSearch
 * @param {string} title - Main heading text
 * @param {string} [description] - Supportive description text
 * @param {React.ReactNode} [action] - Optional CTA button or element
 * @param {string} [className] - Additional class names
 */
export default function EmptyState({
  icon,
  title = 'No data found',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 mb-5">
        {icon ?? <PackageSearch className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
