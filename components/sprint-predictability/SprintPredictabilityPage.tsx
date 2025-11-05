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
import { SprintPredictabilityItem, getCleanJiraUrl } from '@/lib/config';

export default function SprintPredictabilityPage() {
  const [data, setData] = useState<SprintPredictabilityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Filters
  const [sprintNameFilter, setSprintNameFilter] = useState('');
  const [months, setMonths] = useState<number>(3);

  const apiService = new ApiService();

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getSprintPredictability(months);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sprint predictability data';
      setError(`${errorMessage}. Check browser console for details.`);
      setData([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Sprint Predictability API Error:', {
          error: err,
          endpoint: '/api/v1/sprints/sprint-predictability',
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

  // Helper function to get cycle time color
  const getCycleTimeColor = (value: number): string => {
    if (value < 10) {
      return 'text-green-600 font-bold'; // Green
    } else if (value >= 10 && value <= 15) {
      return 'text-yellow-600 font-bold'; // Yellow
    } else {
      return 'text-red-600 font-bold'; // Red
    }
  };

  // Define columns
  const columns = useMemo<ColumnDef<SprintPredictabilityItem>[]>(() => [
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
    {
      accessorKey: 'sprint_predictability',
      header: 'SPRINT PREDICTABILITY %',
      size: 100,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        // sprint_predictability is a decimal (0-1), multiply by 100 to get percentage
        const percentValue = typeof value === 'number' ? value * 100 : 0;
        const formatted = percentValue.toFixed(1);
        const isGreen = percentValue >= 75;
        return (
          <div className={`text-sm font-medium text-center ${isGreen ? 'text-green-600 font-bold' : 'text-gray-900'}`}>
            {formatted}%
          </div>
        );
      },
    },
    {
      accessorKey: 'avg_story_cycle_time',
      header: 'AVG. STORY CYCLE TIME (DAYS)',
      size: 120,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        const formatted = typeof value === 'number' ? value.toFixed(1) : '0.0';
        const colorClass = getCycleTimeColor(value);
        return (
          <div className={`text-sm font-medium text-center ${colorClass}`}>
            {formatted}
          </div>
        );
      },
    },
    {
      id: 'jira_link',
      header: 'NOT COMPLETED ISSUES',
      size: 140,
      cell: ({ row }) => {
        const item = row.original;
        const issueKeys = item.issues_not_completed_keys || [];
        
        if (!issueKeys || issueKeys.length === 0) {
          return (
            <div className="text-sm text-gray-500 text-center">
              -
            </div>
          );
        }

        const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          const cleanJiraUrl = getCleanJiraUrl();
          // Construct Jira JQL search URL for multiple issue keys
          // Format: key IN (KEY1, KEY2, KEY3)
          const keysParam = issueKeys.join(', ');
          const jqlQuery = `key IN (${keysParam})`;
          const encodedJql = encodeURIComponent(jqlQuery);
          const jiraLink = `${cleanJiraUrl}/issues/?jql=${encodedJql}`;
          window.open(jiraLink, '_blank');
        };

        return (
          <div
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-center"
            onClick={handleClick}
          >
{issueKeys.length} issue{issueKeys.length !== 1 ? 's' : ''}
          </div>
        );
      },
    },
  ], []);

  // Filter data by sprint name
  const filteredData = useMemo(() => {
    if (!sprintNameFilter) return data;
    const filterLower = sprintNameFilter.toLowerCase();
    return data.filter(item => 
      item.sprint_name.toLowerCase().includes(filterLower)
    );
  }, [data, sprintNameFilter]);

  const table = useReactTable({
    data: filteredData,
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
          <div className="w-[250px]">
            <label htmlFor="sprint-name-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Sprint Name
            </label>
            <input
              id="sprint-name-filter"
              type="text"
              value={sprintNameFilter}
              onChange={(e) => setSprintNameFilter(e.target.value)}
              placeholder="Filter by sprint name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
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
              <option value={3}>Last 3 Months</option>
              <option value={4}>Last 4 Months</option>
              <option value={6}>Last 6 Months</option>
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
          <p className="mt-4 text-gray-600">Loading sprint predictability data...</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-[50%]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                    {headerGroup.headers.map(header => {
                      const isPredictability = header.id === 'sprint_predictability';
                      const isCycleTime = header.id === 'avg_story_cycle_time';
                      const isIssuesNotCompleted = header.id === 'issues_not_completed';
                      const isJiraLink = header.id === 'jira_link';
                      const isCenterAligned = isPredictability || isCycleTime || isIssuesNotCompleted || isJiraLink;
                      
                      return (
                        <th
                          key={header.id}
                          className={`px-2 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 ${isCenterAligned ? 'text-center' : 'text-left'}`}
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
                          const isPredictability = cell.column.id === 'sprint_predictability';
                          const isCycleTime = cell.column.id === 'avg_story_cycle_time';
                          const isIssuesNotCompleted = cell.column.id === 'issues_not_completed';
                          const isJiraLink = cell.column.id === 'jira_link';
                          const isCenterAligned = isPredictability || isCycleTime || isIssuesNotCompleted || isJiraLink;
                          
                          return (
                            <td
                              key={cell.id}
                              className={`px-2 py-2 border-r border-gray-100 last:border-r-0 ${isCenterAligned ? 'text-center' : ''}`}
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

