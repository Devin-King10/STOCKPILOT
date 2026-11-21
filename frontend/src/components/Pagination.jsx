import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination
 * @param {number} currentPage - 1-based current page
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - (page: number) => void
 * @param {number} [totalItems] - Total record count (optional, shown as "X items")
 * @param {number} [pageSize] - Records per page (optional, for "Showing X-Y of Z")
 * @param {boolean} [showFirstLast] - Show first/last page jump buttons
 * @param {string} [className]
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  showFirstLast = true,
  className = '',
}) {
  if (totalPages <= 1) return null;

  const goTo = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  // Build visible page numbers with ellipsis
  const getPages = () => {
    const delta = 1;
    const pages = [];
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pages = getPages();

  // Showing X–Y of Z
  const showingText = (() => {
    if (!totalItems || !pageSize) return null;
    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);
    return `Showing ${from}–${to} of ${totalItems}`;
  })();

  const btnBase =
    'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const btnNormal = `${btnBase} text-gray-600 hover:bg-gray-100`;
  const btnActive = `${btnBase} bg-blue-600 text-white shadow-sm pointer-events-none`;
  const btnEllipsis = `${btnBase} text-gray-400 pointer-events-none`;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {showingText ? (
        <span className="text-sm text-gray-500">{showingText}</span>
      ) : (
        <span className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </span>
      )}

      <nav className="flex items-center gap-1" aria-label="Pagination">
        {showFirstLast && (
          <button
            onClick={() => goTo(1)}
            disabled={currentPage === 1}
            className={btnNormal}
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className={btnNormal}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className={btnEllipsis}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              className={p === currentPage ? btnActive : btnNormal}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={btnNormal}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {showFirstLast && (
          <button
            onClick={() => goTo(totalPages)}
            disabled={currentPage === totalPages}
            className={btnNormal}
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </nav>
    </div>
  );
}
