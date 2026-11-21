const STATUS_CONFIG = {
  'Order Created':        { bg: 'bg-gray-100',    text: 'text-gray-700',   dot: 'bg-gray-400'   },
  'Picking Pending':      { bg: 'bg-yellow-100',  text: 'text-yellow-800', dot: 'bg-yellow-500' },
  'Picking In Progress':  { bg: 'bg-blue-100',    text: 'text-blue-800',   dot: 'bg-blue-500'   },
  'Picking Completed':    { bg: 'bg-cyan-100',    text: 'text-cyan-800',   dot: 'bg-cyan-500'   },
  'Packing Pending':      { bg: 'bg-orange-100',  text: 'text-orange-800', dot: 'bg-orange-500' },
  'Packing In Progress':  { bg: 'bg-purple-100',  text: 'text-purple-800', dot: 'bg-purple-500' },
  'Packing Completed':    { bg: 'bg-indigo-100',  text: 'text-indigo-800', dot: 'bg-indigo-500' },
  'Ready for Dispatch':   { bg: 'bg-emerald-100', text: 'text-emerald-800',dot: 'bg-emerald-500'},
  'Dispatched':           { bg: 'bg-green-100',   text: 'text-green-800',  dot: 'bg-green-500'  },
  'Delivered':            { bg: 'bg-teal-100',    text: 'text-teal-800',   dot: 'bg-teal-500'   },
  'On Hold':              { bg: 'bg-amber-100',   text: 'text-amber-800',  dot: 'bg-amber-500'  },
  'Cancelled':            { bg: 'bg-red-100',     text: 'text-red-800',    dot: 'bg-red-500'    },
};

const DEFAULT_CONFIG = { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };

/**
 * StatusBadge
 * @param {string} status - One of the predefined order status strings
 * @param {boolean} dot - Whether to show a colored dot indicator
 * @param {string} className - Additional class names
 */
export default function StatusBadge({ status, dot = true, className = '' }) {
  const config = STATUS_CONFIG[status] || DEFAULT_CONFIG;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.bg} ${config.text} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      )}
      {status || 'Unknown'}
    </span>
  );
}
