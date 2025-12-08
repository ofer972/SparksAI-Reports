'use client';

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ActiveSprintSummaryItem, getCleanJiraUrl } from '@/lib/config';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';

// ExpandableCell component for long text with Read More/Read Less
const ExpandableCell = ({ content, maxLength = 150 }: {
  content: string;
  maxLength?: number;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const needsTruncation = content.length > maxLength;

  if (!needsTruncation) {
    return (
      <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  }

  return (
    <div className="relative">
      {isExpanded ? (
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {content}
        </div>
      ) : (
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-2 overflow-hidden">
          {content.substring(0, maxLength)}
          {content.length > maxLength && (
            <span className="opacity-70">...</span>
          )}
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="mt-1 text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
        aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
      >
        {isExpanded ? (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Read less
          </>
        ) : (
          <>
            Read more
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
};

export interface ActiveSprintReportViewProps {
  data: ActiveSprintSummaryItem[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const ActiveSprintReportView: React.FC<ActiveSprintReportViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
  componentProps,
  togglePin,
  pinnedFilters = [],
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;

  const handleTeamGroupChange = React.useCallback(
    (value: string | null, type: 'group' | 'team', name: string) => {
      if (value === null) {
        setFilters((prev) => ({
          ...prev,
          team_name: '',
          isGroup: false,
        }));
      } else {
        setFilters((prev) => ({
          ...prev,
          team_name: name,
          isGroup: type === 'group',
        }));
      }
    },
    [setFilters]
  );

  // Dynamically build columns from data
  const columns = useMemo<ColumnDef<ActiveSprintSummaryItem>[]>(() => {
    if (data.length === 0) {
      return [];
    }

    // Get all unique keys from the data (excluding team_name, sprint_name, sprint_id, and _keys fields which we'll handle specially)
    const firstItem = data[0];
    const allKeys = Object.keys(firstItem);

    // Filter out team_name, sprint_name, sprint_id, start_date, overall_progress_pct_color, and all _keys fields (they're used for links/coloring, not displayed as columns)
    const otherKeys = allKeys.filter(key =>
      key !== 'team_name' &&
      key !== 'sprint_name' &&
      key !== 'sprint_id' &&
      key !== 'start_date' &&
      key !== 'overall_progress_pct_color' &&
      !key.endsWith('_keys')
    );

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
        // Number field - check if it's a percentage field or an issue count field that should be a link
        const isPercentage = key.toLowerCase().includes('pct') || key.toLowerCase().includes('percent') || key.toLowerCase().includes('progress');
        const isOverallProgressPct = key === 'overall_progress_pct';
        // Check if this is an issue count field that has a corresponding _keys field
        const hasKeysField = firstItem[`${key}_keys`] !== undefined;
        const isIssueCountField = hasKeysField && (
          key === 'issues_at_start' ||
          key === 'issues_added' ||
          key === 'issues_done' ||
          key === 'flagged_issues' ||
          key === 'issues_remaining'
        );

        cellRenderer = ({ getValue, row }) => {
          const val = getValue() as number;
          if (val === null || val === undefined) {
            return <div className="text-sm text-gray-500 text-center">-</div>;
          }
          if (isOverallProgressPct) {
            // Display with one decimal place, use overall_progress_pct_color from API
            const formattedVal = val.toFixed(1);
            const item = row.original;
            const progressColor = item.overall_progress_pct_color;

            let colorClass = 'text-gray-700';
            if (progressColor === 'green') {
              colorClass = 'text-green-600 font-bold';
            } else if (progressColor === 'yellow') {
              colorClass = 'text-yellow-600 font-bold';
            } else if (progressColor === 'red') {
              colorClass = 'text-red-600 font-bold';
            } else {
              // null - Unable to calculate
              colorClass = 'text-gray-500';
            }

            return (
              <div className={`text-sm text-center font-medium ${colorClass}`}>
                {formattedVal}%
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
          // If it's an issue count field with keys, make it a clickable link
          if (isIssueCountField) {
            const item = row.original;
            const issueKeys = item[`${key}_keys`] as string[] || [];

            if (!issueKeys || issueKeys.length === 0 || val === 0) {
              return (
                <div className="text-sm text-gray-500 text-center">
                  {val.toLocaleString()}
                </div>
              );
            }

            const handleClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              const cleanJiraUrl = getCleanJiraUrl();
              const keysParam = issueKeys.join(', ');
              const jqlQuery = `key IN (${keysParam})`;
              const encodedJql = encodeURIComponent(jqlQuery);
              const jiraLink = `${cleanJiraUrl}/issues/?jql=${encodedJql}`;
              window.open(jiraLink, '_blank');
            };

            return (
              <div
                className="text-sm font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer text-center"
                onClick={handleClick}
                title={issueKeys.join(', ')}
              >
                {val.toLocaleString()}
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
        // String or other - check if it's sprint_goal for expandable functionality
        const isSprintGoal = key === 'sprint_goal';
        cellRenderer = ({ getValue, row }) => {
          const val = getValue();
          if (!val) {
            return (
              <div className="text-sm text-gray-500">-</div>
            );
          }

          if (isSprintGoal) {
            // Use ExpandableCell for sprint_goal
            return <ExpandableCell content={String(val)} maxLength={150} />;
          }

          return (
            <div className="text-sm text-gray-700">
              {String(val)}
            </div>
          );
        };
      }

      // Make sprint_goal column wider
      const columnSize = key === 'sprint_goal' ? 300 : 120;

      builtColumns.push({
        accessorKey: key,
        header: key.toUpperCase().replace(/_/g, ' '),
        size: columnSize,
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

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamName}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];

    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
        filterKey: 'team_name',
        isPinned: pinnedFilters.includes('team_name'),
      });
    }

    return badges;
  }, [teamName, isGroup, pinnedFilters]);

  return (
    <ReportCard
      title="Active Sprint Summary by Team"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
    >
      <div className="h-full w-full flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-gray-600">Loading active sprint summary data...</div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10">
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
    </ReportCard>
  );
};

export default ActiveSprintReportView;
