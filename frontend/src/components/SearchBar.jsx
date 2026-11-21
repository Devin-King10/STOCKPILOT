import { Search, X } from 'lucide-react';

/**
 * SearchBar
 * @param {string} [value] - Controlled value
 * @param {function} [onChange] - Change handler (e) => void
 * @param {function} [onClear] - Called when clear button is clicked
 * @param {string} [placeholder]
 * @param {string} [className] - Additional class names on wrapper
 * @param {boolean} [autoFocus]
 * @param {string} [name]
 * @param {string} [id]
 */
export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search…',
  className = '',
  autoFocus = false,
  name,
  id,
}) {
  const isControlled = value !== undefined;
  const showClear = isControlled && value.length > 0;

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        id={id}
        name={name}
        type="search"
        value={isControlled ? value : undefined}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
          placeholder-gray-400 text-gray-800
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
          transition-colors"
      />
      {showClear && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
