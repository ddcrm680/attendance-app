type Props = {
  page: number;
  lastPage: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  label?: string;
};

export default function PaginationControls({
  page,
  lastPage,
  loading = false,
  onPageChange,
  label = "Pagination",
}: Props) {
  if (lastPage <= 1) return null;

  return (
    <nav
      className="flex items-center justify-between gap-3 text-sm"
      aria-label={label}
    >
      <button
        type="button"
        disabled={loading || page === 1}
        onClick={() => onPageChange(page - 1)}
        className="app-secondary-action min-h-10 rounded px-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-center">
        Page {page} of {lastPage}
      </span>
      <button
        type="button"
        disabled={loading || page >= lastPage}
        onClick={() => onPageChange(page + 1)}
        className="app-secondary-action min-h-10 rounded px-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}
