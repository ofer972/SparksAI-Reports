'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  Row,
  ExpandedState,
} from '@tanstack/react-table';
import { HierarchyItem } from '@/lib/config';
import { TreeNode, ColumnConfig, HierarchyTableProps } from './types';
import { buildTree, flattenTree, getStatusColor, getTypeColor, getStatusCategoryColor, getProgressColor } from './utils';

export default function HierarchyTable({
  data,
  columns,
  defaultExpanded = false,
  onRowClick,
  className = '',
}: HierarchyTableProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Build tree structure from flat data
  const tree = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('HierarchyTable: Building tree from data:', data);
    }
    const result = buildTree(data);
    if (process.env.NODE_ENV === 'development') {
      console.log('HierarchyTable: Tree result:', result);
    }
    return result;
  }, [data]);

  // Get all expanded keys
  const expandedKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.keys(expanded).forEach(key => {
      if (expanded[key]) {
        keys.add(key);
      }
    });
    return keys;
  }, [expanded]);

  // Flatten tree for display
  const flatData = useMemo(() => {
    return flattenTree(tree, expandedKeys);
  }, [tree, expandedKeys]);

  // Toggle row expansion
  const toggleExpanded = useCallback((key: string) => {
    setExpanded(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Expand/collapse all
  const toggleAllExpanded = useCallback(() => {
    if (Object.keys(expanded).length === 0 || Object.values(expanded).every(v => !v)) {
      // Expand all
      const allKeys: ExpandedState = {};
      const collectKeys = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            allKeys[node.key] = true;
            collectKeys(node.children);
          }
        });
      };
      collectKeys(tree);
      setExpanded(allKeys);
    } else {
      // Collapse all
      setExpanded({});
    }
  }, [expanded, tree]);

  // Build column definitions
  const columnDefs = useMemo<ColumnDef<TreeNode>[]>(() => {
    return columns.map(col => {
      const accessorKey = col.accessorKey || col.id;
      
      return {
        id: col.id,
        header: col.header,
        accessorKey,
        minSize: col.minWidth,
        maxSize: col.maxWidth,
        cell: ({ getValue, row, column }) => {
          const value = getValue();
          const item = row.original;
          const level = item.level || 0;

          // Custom cell renderer
          if (col.cell) {
            return col.cell({ getValue, row, column });
          }

          // Link renderer (Key only - Summary is now text)
          if (col.renderer === 'link' || col.id === 'key') {
            let linkUrl = col.linkBuilder ? col.linkBuilder(item) : `#${item.key}`;
            
            // For Key column, build JIRA URL
            if (col.id === 'key' && item.key) {
              const jiraUrl = process.env.NEXT_PUBLIC_JIRA_URL || 'https://argus-sec.atlassian.net/';
              const cleanJiraUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
              linkUrl = `${cleanJiraUrl}/browse/${item.key}`;
            }
            
            return (
              <div
                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (col.id === 'key' && item.key) {
                    // Open JIRA link in new tab
                    const jiraUrl = process.env.NEXT_PUBLIC_JIRA_URL || 'https://argus-sec.atlassian.net/';
                    const cleanJiraUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
                    window.open(`${cleanJiraUrl}/browse/${item.key}`, '_blank');
                  } else if (onRowClick) {
                    onRowClick(item);
                  } else if (col.linkBuilder) {
                    window.open(linkUrl, '_blank');
                  }
                }}
                style={{ paddingLeft: `${level * 20}px` }}
              >
                {value || item[accessorKey] || '-'}
              </div>
            );
          }

          // Dependency column - show checkbox only if true
          if (col.id === 'Dependency' || col.accessorKey === 'Dependency') {
            const isDependency = value === true || value === 'true' || String(value).toLowerCase() === 'true';
            
            if (!isDependency) {
              return <div className="text-center"></div>;
            }
            
            return (
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded border-2 border-blue-600 bg-blue-50">
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            );
          }

          // Badge renderer with color mapping
          if (col.renderer === 'badge' || col.id === 'status' || col.id === 'type' || col.id === 'status_category') {
            let badgeClass = 'px-2 py-1 rounded text-xs font-medium border';
            
            if (col.colorMap && value) {
              badgeClass += ` ${col.colorMap[String(value)] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
            } else if (col.id === 'status' || col.id === 'Status') {
              // Status should use status_category colors - no fallback
              // Try multiple possible field names for status_category
              const statusCategory = item.status_category || 
                                     item['Status Category'] || 
                                     item['status_category'] ||
                                     item['Status Category of Epic'];
              
              badgeClass += ` ${getStatusCategoryColor(String(statusCategory || ''))}`;
            } else if (col.id === 'status_category') {
              badgeClass += ` ${getStatusCategoryColor(String(value || ''))}`;
            } else if (col.id === 'type') {
              badgeClass += ` ${getTypeColor(String(value || ''))}`;
            } else {
              badgeClass += ' bg-gray-100 text-gray-800 border-gray-200';
            }

            return (
              <div style={{ paddingLeft: `${level * 20}px` }}>
                <span className={badgeClass}>
                  {value || '-'}
                </span>
              </div>
            );
          }

          // # Flagged Issues - hide if zero
          if (col.id === '# Flagged Issues' || col.accessorKey === '# Flagged Issues') {
            const flaggedCount = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value) : 0);
            
            if (flaggedCount === 0 || isNaN(flaggedCount)) {
              return <div className="text-center"></div>;
            }
            
            return (
              <div className="text-center">
                <span className="text-sm text-gray-700">
                  {flaggedCount}
                </span>
              </div>
            );
          }

          // Epic Progress % - special handling with color and center alignment
          if (col.id === 'Epic Progress %' || col.accessorKey === 'Epic Progress %') {
            const progressNum = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
            const progressInt = Math.floor(progressNum); // Truncate to integer
            const displayValue = isNaN(progressInt) ? '-' : `${progressInt}%`;
            
            // Get Status field (not status_category)
            const status = item.Status || item.status || '';
            const statusLower = String(status).toLowerCase();
            
            // Determine color: red bold if Status is "done" and progress is not 100%
            let progressColor = '';
            if ((statusLower === 'done' || statusLower === 'closed') && progressInt !== 100) {
              progressColor = 'text-red-600 font-bold';
            } else if (progressInt === 100) {
              progressColor = 'text-green-600 font-semibold';
            } else {
              progressColor = 'text-gray-700';
            }

            return (
              <div className="text-center">
                <span className={`text-sm ${progressColor}`}>
                  {displayValue}
                </span>
              </div>
            );
          }

          // Default text renderer with indentation
          return (
            <div
              className="text-sm text-gray-700"
              style={{ paddingLeft: `${level * 20}px` }}
            >
              {value !== null && value !== undefined ? String(value) : '-'}
            </div>
          );
        },
      };
    });
  }, [columns, onRowClick]);

  // Add expand/collapse column
  const columnsWithExpand = useMemo<ColumnDef<TreeNode>[]>(() => {
    // Expand/collapse icon options:
    // Option 1: Plus/Minus (+/−) - simple and clear
    // Option 2: Chevron (▶/▼) - common in file browsers
    // Option 3: Caret (►/▼) - arrow-like
    // Option 4: Triangle (▷/▽) - geometric
    // Option 5: SVG chevron - modern and customizable
    
    const expandIcon = (expanded: boolean) => {
      // Current: Plus/Minus
      // return expanded ? '−' : '+';
      
      // Option: Chevron right/down
      return expanded ? '▼' : '▶';
      
      // Option: Caret right/down  
      // return expanded ? '▼' : '►';
      
      // Option: Triangle
      // return expanded ? '▽' : '▷';
    };

    const expandColumn: ColumnDef<TreeNode> = {
      id: 'expand',
      header: () => (
        <button
          onClick={toggleAllExpanded}
          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 transition-colors"
          title="Expand/Collapse All"
        >
          {Object.keys(expanded).length > 0 && Object.values(expanded).some(v => v) ? '▼' : '▶'}
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expanded[item.key] || false;

        if (!hasChildren) {
          return <div className="w-6" />;
        }

        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(item.key);
            }}
            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {expandIcon(isExpanded)}
          </button>
        );
      },
      size: 50,
      minSize: 50,
      maxSize: 50,
    };

    return [expandColumn, ...columnDefs];
  }, [columnDefs, expanded, toggleExpanded, toggleAllExpanded]);

  // Initialize expanded state
  useEffect(() => {
    if (defaultExpanded && Object.keys(expanded).length === 0) {
      toggleAllExpanded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpanded]);

  const table = useReactTable({
    data: flatData,
    columns: columnsWithExpand,
    state: {
      expanded,
      globalFilter,
    },
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableExpanding: true,
    getSubRows: (row) => row.children,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = String(filterValue).toLowerCase();
      if (!searchValue) return true;
      
      // Search across all column values
      const item = row.original;
      const searchableValues = Object.values(item)
        .map(v => String(v || '').toLowerCase())
        .join(' ');
      
      return searchableValues.includes(searchValue);
    },
  });

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Global Filter */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                {headerGroup.headers.map(header => {
                  const isProgressColumn = header.id === 'Epic Progress %' || header.column.id === 'Epic Progress %';
                  const isFlaggedColumn = header.id === '# Flagged Issues' || header.column.id === '# Flagged Issues';
                  const isDependencyColumn = header.id === 'Dependency' || header.column.id === 'Dependency';
                  const isCenterAligned = isProgressColumn || isFlaggedColumn || isDependencyColumn;
                  return (
                  <th
                    key={header.id}
                    className={`px-1.5 py-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isCenterAligned ? 'text-center' : 'text-left'}`}
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? 'cursor-pointer select-none hover:text-gray-900'
                            : '',
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? ''}
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
                <td colSpan={columnsWithExpand.length} className="px-1.5 py-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => {
                const isEpic = row.original.Type === 'Epic' || row.original.type === 'Epic';
                return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 transition-colors ${
                    isEpic 
                      ? 'bg-gray-50 hover:bg-gray-100' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onRowClick && onRowClick(row.original)}
                >
                  {row.getVisibleCells().map(cell => {
                    const isProgressColumn = cell.column.id === 'Epic Progress %';
                    const isFlaggedColumn = cell.column.id === '# Flagged Issues';
                    const isDependencyColumn = cell.column.id === 'Dependency';
                    const isCenterAligned = isProgressColumn || isFlaggedColumn || isDependencyColumn;
                    return (
                      <td
                        key={cell.id}
                        className={`px-1.5 py-1.5 text-sm ${isCenterAligned ? 'text-center' : ''}`}
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

      {/* Footer with row count */}
      <div className="p-4 border-t border-gray-200 text-sm text-gray-600">
        Showing {table.getRowModel().rows.length} of {data.length} items
      </div>
    </div>
  );
}

