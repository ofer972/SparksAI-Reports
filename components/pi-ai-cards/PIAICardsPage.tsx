'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ApiService } from '@/lib/api';
import { PIAICard } from '@/lib/config';
import EditPIAICardDialog from './EditPIAICardDialog';
import Toast from '@/components/Toast';

export default function PIAICardsPage() {
  const [data, setData] = useState<PIAICard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingCard, setEditingCard] = useState<PIAICard | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [cardNameFilter, setCardNameFilter] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const apiService = new ApiService();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getPIAICardsCollection();
      setData(result.cards || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch PI AI cards';
      setError(errorMessage);
      setData([]);
      if (process.env.NODE_ENV === 'development') {
        console.error('PI AI Cards API Error:', {
          error: err,
          endpoint: '/api/v1/pi-ai-cards/getAllFields',
          dateFilter,
          cardNameFilter
        });
      }
    } finally {
      setLoading(false);
    }
  }, [dateFilter, cardNameFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = useCallback((card: PIAICard) => {
    setEditingCard(card);
  }, []);

  const handleSave = useCallback(async (updatedCard: PIAICard) => {
    try {
      setLoading(true);
      setError(null);
      // Only send updatable fields (exclude id, created_at, updated_at)
      const { id, created_at, updated_at, ...updates } = updatedCard;
      const result = await apiService.updatePIAICard(id, updates);

      // Verify the response is successful - if we get here without an error, it's successful
      // The API method already throws on error, so if we reach here, it's a success
      setEditingCard(null);
      setToast({ message: 'Successfully saved PI AI card', type: 'success' });
      await fetchData(); // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update PI AI card';
      setError(errorMessage);
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  const handleCloseDialog = useCallback(() => {
    setEditingCard(null);
  }, []);

  // Build columns dynamically from the first item
  const columns = useMemo<ColumnDef<PIAICard>[]>(() => {
    if (data.length === 0) {
      return [];
    }

    const firstItem = data[0];
    const columnKeys = Object.keys(firstItem);

    // Create Action column first (on the left)
    const actionColumn: ColumnDef<PIAICard> = {
      id: 'action',
      header: 'ACTION',
      size: 80,
      cell: ({ row }: { row: any }) => {
        return (
          <button
            onClick={() => handleEdit(row.original)}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            Edit
          </button>
        );
      },
    };

    // Build other columns
    const otherColumns = columnKeys.map((key) => {
      const value = firstItem[key as keyof PIAICard];
      let cellRenderer;

      if (key === 'id') {
        // ID column - just show the ID
        cellRenderer = ({ getValue }: { getValue: () => any }) => {
          const val = getValue();
          return (
            <div className="text-sm text-gray-700">{String(val)}</div>
          );
        };
      } else if (typeof value === 'string' && (key === 'description' || key === 'full_information' || key === 'information_json')) {
        // Long text fields - truncate to 20 characters in table view
        cellRenderer = ({ getValue }: { getValue: () => any }) => {
          const val = getValue() as string;
          if (!val) {
            return <div className="text-sm text-gray-500">-</div>;
          }

          // Format JSON if it's the information_json field
          if (key === 'information_json') {
            try {
              const parsed = JSON.parse(val);
              const formatted = JSON.stringify(parsed, null, 2);
              // Truncate to 20 characters
              const truncated = formatted.length > 20 ? `${formatted.substring(0, 20)}...` : formatted;
              return (
                <div className="text-xs text-gray-700 whitespace-pre-wrap break-words max-w-md font-mono bg-gray-50 p-2 rounded border">
                  {truncated}
                </div>
              );
            } catch {
              // If not valid JSON, show as regular text truncated to 20 characters
              const truncated = val.length > 20 ? `${val.substring(0, 20)}...` : val;
              return (
                <div className="text-sm text-gray-700 whitespace-pre-wrap break-words max-w-md">
                  {truncated}
                </div>
              );
            }
          }

          // For description and full_information, truncate to 20 characters
          const truncated = val.length > 20 ? `${val.substring(0, 20)}...` : val;
          return (
            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words max-w-md">
              {truncated}
            </div>
          );
        };
      } else if (typeof value === 'number') {
        // Number field
        cellRenderer = ({ getValue }: { getValue: () => any }) => {
          const val = getValue() as number;
          return (
            <div className="text-sm text-gray-700 text-right">
              {val !== null && val !== undefined ? val.toLocaleString() : '-'}
            </div>
          );
        };
      } else {
        // String or other
        cellRenderer = ({ getValue }: { getValue: () => any }) => {
          const val = getValue();
          return (
            <div className="text-sm text-gray-700">
              {val !== null && val !== undefined ? String(val) : '-'}
            </div>
          );
        };
      }

      // Determine column size
      let columnSize = 150;
      if (key === 'id') columnSize = 100;
      else if (key === 'description' || key === 'full_information' || key === 'information_json') columnSize = 300;
      else if (key === 'date' || key === 'created_at' || key === 'updated_at') columnSize = 120;
      else if (key === 'pi_name' || key === 'card_name' || key === 'card_type') columnSize = 150;

      return {
        accessorKey: key,
        header: key.toUpperCase().replace(/_/g, ' '),
        size: columnSize,
        cell: cellRenderer,
      };
    });

    // Return Action column first, then other columns
    return [actionColumn, ...otherColumns];
  }, [data, handleEdit]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="h-full flex flex-col p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">PI AI Cards</h2>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-[200px]">
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Date (YYYY-MM-DD)
              </label>
              <input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-[200px]">
              <label htmlFor="card-name-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Card Name
              </label>
              <input
                id="card-name-filter"
                type="text"
                value={cardNameFilter}
                onChange={(e) => setCardNameFilter(e.target.value)}
                placeholder="Filter by card name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => {
                setDateFilter('');
                setCardNameFilter('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e0 #f7fafc' }}>
          <style jsx global>{`
            .pi-ai-cards-table-container::-webkit-scrollbar {
              width: 12px;
              height: 12px;
            }
            .pi-ai-cards-table-container::-webkit-scrollbar-track {
              background: #f7fafc;
            }
            .pi-ai-cards-table-container::-webkit-scrollbar-thumb {
              background: #cbd5e0;
              border-radius: 6px;
            }
            .pi-ai-cards-table-container::-webkit-scrollbar-thumb:hover {
              background: #a0aec0;
            }
          `}</style>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto pi-ai-cards-table-container" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-100"
                          style={{
                            width: header.getSize() !== 150 ? header.getSize() : undefined,
                            minWidth: header.getSize(),
                          }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() && (
                              <span className="text-gray-400">
                                {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-4 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row, index) => {
                      const isEven = index % 2 === 0;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-gray-100 transition-colors ${isEven ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td
                              key={cell.id}
                              className="pl-3 pr-3 py-2 border-r border-gray-100 last:border-r-0"
                              style={{
                                width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      {editingCard && (
        <EditPIAICardDialog
          card={editingCard}
          onSave={handleSave}
          onClose={handleCloseDialog}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

