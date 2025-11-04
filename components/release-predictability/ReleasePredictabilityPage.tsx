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
import { ReleasePredictabilityItem, getCleanJiraUrl } from '@/lib/config';

export default function ReleasePredictabilityPage() {
  const [data, setData] = useState<ReleasePredictabilityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Filter
  const [months, setMonths] = useState<number>(3);

  const apiService = new ApiService();

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getReleasePredictability(months);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch release predictability data';
      setError(`${errorMessage}. Check browser console for details.`);
      setData([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Release Predictability API Error:', {
          error: err,
          endpoint: '/api/v1/issues/release-predictability',
          months
        });
      }
    } finally {
      setLoading(false);
    }
  }, [months]);

  // Auto-fetch on mount and when months changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper function to get percentage color (only green for 100%, otherwise default)
  const getPercentageColor = (value: number): string => {
    if (value === 100) {
      return 'text-green-600 font-bold'; // Green only for 100%
    }
    return 'text-gray-900'; // Default color for all other values
  };

  // Define columns based on the API response structure
  const columns = useMemo<ColumnDef<ReleasePredictabilityItem>[]>(() => [
    {
      accessorKey: 'version_name',
      header: 'VERSION NAME',
      size: 220,
      cell: ({ getValue, row }) => {
        const value = getValue() as string;
        const projectKey = row.original.project_key;
        
        if (!value) {
          return <div className="text-sm text-gray-900 font-medium">-</div>;
        }
        
        const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (projectKey) {
            const cleanJiraUrl = getCleanJiraUrl();
            const jiraLink = `${cleanJiraUrl}/plugins/servlet/project-config/${projectKey}/administer-versions`;
            window.open(jiraLink, '_blank');
          }
        };
        
        return (
          <div
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
            onClick={handleClick}
          >
            {value}
          </div>
        );
      },
    },
    {
      accessorKey: 'project_key',
      header: 'PROJECT KEY',
      size: 100,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className="text-sm text-gray-900 text-center">
            {value || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'release_start_date',
      header: 'RELEASE START DATE',
      size: 140,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className="text-sm text-gray-900 text-center">
            {value || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'release_date',
      header: 'RELEASE DATE',
      size: 140,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className="text-sm text-gray-900 text-center">
            {value || '-'}
          </div>
        );
      },
    },
    {
      id: 'overall_progress',
      header: 'OVERALL PROGRESS',
      size: 200,
      cell: ({ row }) => {
        const item = row.original;
        const totalEpics = item.total_epics_in_scope || 0;
        const epicsCompleted = item.epics_completed || 0;
        const totalOtherIssues = item.total_other_issues_in_scope || 0;
        const otherIssuesCompleted = item.other_issues_completed || 0;
        
        const totalIssues = totalEpics + totalOtherIssues;
        const completedIssues = epicsCompleted + otherIssuesCompleted;
        
        let progressPercent = 0;
        if (totalIssues > 0) {
          progressPercent = (completedIssues / totalIssues) * 100;
        }
        
        const formattedPercent = progressPercent.toFixed(1);
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 min-w-[45px] text-right">
              {formattedPercent}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'total_epics_in_scope',
      header: 'TOTAL EPICS IN SCOPE',
      size: 130,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <div className="text-sm text-gray-900 text-center">
            {value !== undefined && value !== null ? value : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'epic_percent_completed',
      header: 'EPIC % COMPLETED',
      size: 130,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        if (value === undefined || value === null) return <div className="text-sm text-gray-500 text-center">-</div>;
        const formatted = typeof value === 'number' ? value.toFixed(1) : '0.0';
        const colorClass = getPercentageColor(value);
        return (
          <div className={`text-sm font-medium text-center ${colorClass}`}>
            {formatted}%
          </div>
        );
      },
    },
    {
      accessorKey: 'total_other_issues_in_scope',
      header: 'TOTAL OTHER ISSUES IN SCOPE',
      size: 130,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <div className="text-sm text-gray-900 text-center">
            {value !== undefined && value !== null ? value : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'other_issues_percent_completed',
      header: 'OTHER ISSUES % COMPLETED',
      size: 130,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        if (value === undefined || value === null) return <div className="text-sm text-gray-500 text-center">-</div>;
        const formatted = typeof value === 'number' ? value.toFixed(1) : '0.0';
        const colorClass = getPercentageColor(value);
        return (
          <div className={`text-sm font-medium text-center ${colorClass}`}>
            {formatted}%
          </div>
        );
      },
    },
  ], []);

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[200px]">
            <label htmlFor="time-period" className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              id="time-period"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Last Month</option>
              <option value={2}>Last 2 Months</option>
              <option value={3}>Last 3 Months</option>
              <option value={4}>Last 4 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={9}>Last 9 Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading release predictability data...</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                    {headerGroup.headers.map(header => {
                      const isPercentColumn = header.id.toLowerCase().includes('percent') || header.id.toLowerCase().includes('completed');
                      const isNumericColumn = header.id.toLowerCase().includes('total') || header.id.toLowerCase().includes('completed') || isPercentColumn;
                      const isProjectKey = header.id === 'project_key';
                      const isDateColumn = header.id === 'release_start_date' || header.id === 'release_date';
                      const isCenterAligned = isNumericColumn || isProjectKey || isDateColumn;
                      
                      const isDateHeader = header.id === 'release_start_date' || header.id === 'release_date';
                      const paddingClass = isDateHeader ? 'px-1' : 'px-2';
                      
                      return (
                        <th
                          key={header.id}
                          className={`${paddingClass} py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 ${isCenterAligned ? 'text-center' : 'text-left'}`}
                          style={{
                            width: header.getSize() !== 150 ? header.getSize() : undefined,
                          }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort() ? `cursor-pointer select-none hover:text-gray-900 flex items-center gap-2 ${isCenterAligned ? 'justify-center' : ''}` : '',
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span className="text-gray-400">
                                  {{
                                    asc: '↑',
                                    desc: '↓',
                                  }[header.column.getIsSorted() as string] ?? '↕'}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-2 py-4 text-center text-gray-500">
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
                        {row.getVisibleCells().map(cell => {
                          const isPercentColumn = cell.column.id.toLowerCase().includes('percent') || cell.column.id.toLowerCase().includes('completed');
                          const isNumericColumn = cell.column.id.toLowerCase().includes('total') || cell.column.id.toLowerCase().includes('completed') || isPercentColumn;
                          const isProjectKey = cell.column.id === 'project_key';
                          const isDateColumn = cell.column.id === 'release_start_date' || cell.column.id === 'release_date';
                          const isCenterAligned = isNumericColumn || isProjectKey || isDateColumn;
                          const isDateCell = cell.column.id === 'release_start_date' || cell.column.id === 'release_date';
                          const paddingClass = isDateCell ? 'px-1' : 'px-2';
                          
                          return (
                            <td
                              key={cell.id}
                              className={`${paddingClass} py-2 border-r border-gray-100 last:border-r-0 ${isCenterAligned ? 'text-center' : ''}`}
                              style={{
                                width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

