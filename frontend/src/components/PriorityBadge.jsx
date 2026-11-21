const PRIORITY_CONFIG = {
  LOW:    { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Low'    },
  NORMAL: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Normal' },
  HIGH:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High'   },
  URGENT: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Urgent' },
};

const DEFAULT_CONFIG = { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unknown' };

/**
 * PriorityBadge
 * @param {string} priority - LOW | NORMAL | HIGH | URGENT
 * @param {string} className - Additional class names
 */
export default function PriorityBadge({ priority, className = '' }) {
  const key = priority?.toUpperCase();
  const config = PRIORITY_CONFIG[key] || DEFAULT_CONFIG;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
