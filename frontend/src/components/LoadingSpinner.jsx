/**
 * LoadingSpinner
 * @param {string} [size] - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} [message] - Optional loading message
 * @param {boolean} [fullscreen] - Fill the entire viewport
 * @param {string} [className] - Additional class names
 */
export default function LoadingSpinner({
  size = 'md',
  message,
  fullscreen = false,
  className = '',
}) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-9 h-9 border-[3px]',
    lg: 'w-14 h-14 border-4',
    xl: 'w-20 h-20 border-4',
  };

  const spinner = (
    <div
      className={`animate-spin rounded-full border-blue-200 border-t-blue-600 ${sizeClasses[size] || sizeClasses.md}`}
      role="status"
      aria-label="Loading"
    />
  );

  const wrapper = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${fullscreen ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50' : 'w-full h-full min-h-[200px]'} ${className}`}
    >
      {spinner}
      {message && <p className="text-sm text-gray-500 font-medium">{message}</p>}
    </div>
  );

  return wrapper;
}
