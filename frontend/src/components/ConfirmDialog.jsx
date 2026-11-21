import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

/**
 * ConfirmDialog
 * @param {boolean} isOpen
 * @param {function} onClose - Called on cancel / backdrop click
 * @param {function} onConfirm - Called when user clicks the confirm button
 * @param {string} [title] - Dialog heading
 * @param {string|React.ReactNode} [message] - Body message
 * @param {string} [confirmLabel] - Label for confirm button (default: "Confirm")
 * @param {string} [cancelLabel] - Label for cancel button (default: "Cancel")
 * @param {'danger'|'warning'|'primary'} [variant] - Visual tone
 * @param {boolean} [loading] - Shows loading state on confirm button
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const variantClasses = {
    danger:  'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  const iconColors = {
    danger:  'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600',
    primary: 'bg-blue-100 text-blue-600',
  };

  const btnClass = variantClasses[variant] ?? variantClasses.danger;
  const iconClass = iconColors[variant] ?? iconColors.danger;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlay={!loading}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 ${btnClass}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className={`flex items-center justify-center w-14 h-14 rounded-full ${iconClass}`}>
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
