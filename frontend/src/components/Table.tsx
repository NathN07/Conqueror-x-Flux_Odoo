import { ReactNode } from 'react';
import { Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  page: number;
  limit: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  emptyMessage?: string;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  emptyMessage = 'No records found.',
  keyExtractor,
}: TableProps<T>) {
  return (
    <div className="w-full bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-600 font-semibold">
              {columns.map((col) => (
                <th key={col.key} className={`py-3.5 px-4 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-brand-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const key = keyExtractor ? keyExtractor(item, index) : item.id ?? index;
                return (
                  <tr
                    key={key}
                    className="hover:bg-slate-50/80 transition-colors duration-150"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`py-3.5 px-4 ${col.className || ''}`}>
                        {col.render ? col.render(item, index) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </div>
  );
}
