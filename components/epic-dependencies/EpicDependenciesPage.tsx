'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ApiService } from '@/lib/api';
import { EpicDependencyItem } from '@/lib/config';

export default function EpicDependenciesPage() {
  const [outboundData, setOutboundData] = useState<EpicDependencyItem[]>([]);
  const [inboundData, setInboundData] = useState<EpicDependencyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outboundSorting, setOutboundSorting] = useState<SortingState>([]);
  const [inboundSorting, setInboundSorting] = useState<SortingState>([]);
  const [selectedPI, setSelectedPI] = useState<string>('Q32025');
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [piInput, setPiInput] = useState<string>('Q32025');

  const apiService = new ApiService();

  // Fetch available PIs
  useEffect(() => {
    const fetchPIs = async () => {
      try {
        const pis = await apiService.getPIs();
        if (pis.pis && pis.pis.length > 0) {
          const piNames = pis.pis.map(pi => pi.pi_name);
          setAvailablePIs(piNames);
        }
      } catch (err) {
        console.error('Failed to fetch PIs:', err);
      }
    };
    fetchPIs();
  }, []);

  // Fetch data for both tables
  const fetchData = async (pi?: string) => {
    setLoading(true);
    setError(null);

    try {
      const [outboundResult, inboundResult] = await Promise.all([
        apiService.getEpicOutboundDependencyLoadByQuarter(pi),
        apiService.getEpicInboundDependencyLoadByQuarter(pi),
      ]);
      setOutboundData(outboundResult);
      setInboundData(inboundResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch epic dependency data';
      setError(`${errorMessage}. Check browser console for details.`);
      setOutboundData([]);
      setInboundData([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Epic Dependencies API Error:', {
          error: err,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount and when selectedPI changes
  useEffect(() => {
    fetchData(selectedPI);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPI]);

  const handleApplyFilter = () => {
    const piName = piInput.trim();
    if (piName) {
      setSelectedPI(piName);
      // fetchData will be triggered by useEffect when selectedPI changes
    }
  };

  // Dynamically build columns from data
  const buildColumns = (data: EpicDependencyItem[]): ColumnDef<EpicDependencyItem>[] => {
    if (data.length === 0) return [];

    const firstItem = data[0];
    const allKeys = Object.keys(firstItem);
    
    // Ensure PI is first, then team_name_of_epic, then rest
    const orderedKeys: string[] = [];
    if (allKeys.includes('pi')) {
      orderedKeys.push('pi');
    }
    if (allKeys.includes('team_name_of_epic')) {
      orderedKeys.push('team_name_of_epic');
    }
    // Add remaining keys (excluding already added ones)
    allKeys.forEach(key => {
      if (key !== 'pi' && key !== 'team_name_of_epic') {
        orderedKeys.push(key);
      }
    });

    return orderedKeys.map((key) => {
      const column: ColumnDef<EpicDependencyItem> = {
        accessorKey: key,
        header: key === 'team_name_of_epic' ? 'Team Name' : key.toUpperCase().replace(/_/g, ' '),
        size: 150,
        cell: ({ getValue }) => {
          const value = getValue();
          if (value === null || value === undefined) {
            return <div className="text-xs text-gray-500 text-center">-</div>;
          }
          
          if (typeof value === 'number') {
            return (
              <div className="text-xs text-gray-900 text-center">
                {Number.isInteger(value) ? value : value.toFixed(2)}
              </div>
            );
          }
          
          return (
            <div className="text-xs text-gray-900">
              {String(value)}
            </div>
          );
        },
      };
      return column;
    });
  };

  const outboundColumns = useMemo<ColumnDef<EpicDependencyItem>[]>(() => buildColumns(outboundData), [outboundData]);
  const inboundColumns = useMemo<ColumnDef<EpicDependencyItem>[]>(() => buildColumns(inboundData), [inboundData]);

  const outboundTable = useReactTable({
    data: outboundData,
    columns: outboundColumns,
    state: {
      sorting: outboundSorting,
    },
    onSortingChange: setOutboundSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const inboundTable = useReactTable({
    data: inboundData,
    columns: inboundColumns,
    state: {
      sorting: inboundSorting,
    },
    onSortingChange: setInboundSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-lg font-medium text-gray-700">Loading epic dependency data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-red-600 font-medium mb-2">Error</div>
        <div className="text-sm text-gray-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[300px]">
            <label htmlFor="pi-name-filter" className="block text-sm font-medium text-gray-700 mb-1">
              PI Name
            </label>
            <div className="flex gap-2">
              <input
                id="pi-name-filter"
                type="text"
                value={piInput}
                onChange={(e) => setPiInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilter();
                  }
                }}
                placeholder="Enter PI name"
                list="pi-names-list"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {availablePIs.length > 0 && (
                <datalist id="pi-names-list">
                  {availablePIs.map((pi) => (
                    <option key={pi} value={pi} />
                  ))}
                </datalist>
              )}
            </div>
          </div>

          <div>
            <button
              onClick={handleApplyFilter}
              disabled={loading || !piInput.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Dependencies Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              epic-outbound-dependency-metrics
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                {outboundTable.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-300 last:border-r-0"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'cursor-pointer select-none flex items-center gap-2'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {outboundTable.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={outboundColumns.length}
                      className="px-2 py-4 text-center text-xs text-gray-500 border-r border-gray-300 last:border-r-0"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  outboundTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-2 py-1.5 whitespace-nowrap border-r border-gray-300 last:border-r-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inbound Dependencies Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              epic-inbound-dependency-load
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                {inboundTable.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-300 last:border-r-0"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'cursor-pointer select-none flex items-center gap-2'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inboundTable.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={inboundColumns.length}
                      className="px-2 py-4 text-center text-xs text-gray-500 border-r border-gray-300 last:border-r-0"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  inboundTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-2 py-1.5 whitespace-nowrap border-r border-gray-300 last:border-r-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

