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
import { ActiveSprintSummaryItem } from '@/lib/config';

export default function ActiveSprintReportPage() {
  const [data, setData] = useState<ActiveSprintSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Parameters
  const [teamName, setTeamName] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  const apiService = new ApiService();

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getActiveSprintSummaryByTeam(
        teamName || undefined,
        isGroup
      );
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch active sprint summary data';
      setError(errorMessage);
      setData([]);
      if (process.env.NODE_ENV === 'development') {
        console.error('Active Sprint Summary API Error:', {
          error: err,
          endpoint: '/api/v1/sprints/active-sprint-summary-by-team',
          teamName,
          isGroup
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Dynamically build columns from data
  const columns = useMemo<ColumnDef<ActiveSprintSummaryItem>[]>(() => {
    if (data.length === 0) {
      return [];
    }

    // Get all unique keys from the data (excluding team_name and sprint_name which we'll handle specially)
    const firstItem = data[0];
    const allKeys = Object.keys(firstItem);
    
    // Filter out team_name and sprint_name as they'll be first columns
    const otherKeys = allKeys.filter(key => key !== 'team_name' && key !== 'sprint_name');
    
    // Build columns: team_name first, sprint_name second, then all other fields
    const builtColumns: ColumnDef<ActiveSprintSummaryItem>[] = [
      {
        accessorKey: 'team_name',
        header: 'TEAM NAME',
        size: 150,
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <div className="text-sm text-gray-900 font-medium">
              {value || '-'}
            </div>
          );
        },
      },
      {
        accessorKey: 'sprint_name',
        header: 'SPRINT NAME',
        size: 200,
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <div className="text-sm text-gray-900 font-medium">
              {value || '-'}
            </div>
          );
        },
      },
    ];

    // Add all other fields dynamically
    otherKeys.forEach(key => {
      const value = firstItem[key];
      
      // Format based on value type
      let cellRenderer: ColumnDef<ActiveSprintSummaryItem>['cell'];
      
      if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{4}-\d{2}-\d{2}T/))) {
        // Date field
        cellRenderer = ({ getValue }) => {
          const val = getValue() as string;
          if (!val) return <div className="text-sm text-gray-500 text-center">-</div>;
          try {
            const date = new Date(val);
            const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            return (
              <div className="text-sm text-gray-700 text-center">
                {formatted}
              </div>
            );
          } catch {
            return <div className="text-sm text-gray-700">{val}</div>;
          }
        };
      } else if (typeof value === 'number') {
        // Number field - check if it's a percentage field
        const isPercentage = key.toLowerCase().includes('pct') || key.toLowerCase().includes('percent') || key.toLowerCase().includes('progress');
        const isOverallProgressPct = key === 'overall_progress_pct';
        cellRenderer = ({ getValue }) => {
          const val = getValue() as number;
          if (val === null || val === undefined) {
            return <div className="text-sm text-gray-500 text-center">-</div>;
          }
          if (isOverallProgressPct) {
            // Round to integer and apply green bold styling if above 75
            const roundedVal = Math.round(val);
            const isHighProgress = roundedVal > 75;
            return (
              <div className={`text-sm text-center font-medium ${isHighProgress ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
                {roundedVal}%
              </div>
            );
          }
          if (isPercentage) {
            return (
              <div className="text-sm text-gray-700 text-center font-medium">
                {val}%
              </div>
            );
          }
          return (
            <div className="text-sm text-gray-700 text-center">
              {typeof val === 'number' ? val.toLocaleString() : val || '-'}
            </div>
          );
        };
      } else if (typeof value === 'boolean') {
        // Boolean field
        cellRenderer = ({ getValue }) => {
          const val = getValue() as boolean;
          return (
            <div className="text-sm text-gray-700 text-center">
              {val ? 'Yes' : 'No'}
            </div>
          );
        };
      } else {
        // String or other
        cellRenderer = ({ getValue }) => {
          const val = getValue();
          return (
            <div className="text-sm text-gray-700">
              {val ? String(val) : '-'}
            </div>
          );
        };
      }

      builtColumns.push({
        accessorKey: key,
        header: key.toUpperCase().replace(/_/g, ' '),
        size: 120,
        cell: cellRenderer,
      });
    });

    return builtColumns;
  }, [data]);

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
      {/* Parameters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Parameters</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-[200px]">
            <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">
              Team Name
            </label>
            <input
              id="team-name"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full sm:w-auto flex items-center gap-2">
            <input
              id="is-group"
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is-group" className="text-sm font-medium text-gray-700">
              Is Group
            </label>
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full sm:w-auto px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
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
          <p className="mt-4 text-gray-600">Loading active sprint summary data...</p>
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
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="pl-3 pr-3 py-2 text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 text-left"
                        style={{
                          width: header.getSize() !== 150 ? header.getSize() : undefined,
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-900 flex items-center gap-2' : '',
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
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
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
        </div>
      )}
    </div>
  );
}

