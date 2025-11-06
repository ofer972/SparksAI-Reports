'use client';

import { useState, useEffect, useMemo } from 'react';
import HierarchyTable from './HierarchyTable';
import { ColumnConfig } from './types';
import { HierarchyItem } from '@/lib/config';
import { ApiService } from '@/lib/api';

export default function EpicsHierarchyPage() {
  const [data, setData] = useState<HierarchyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [teamName, setTeamName] = useState('');
  const [piName, setPiName] = useState('');

  const apiService = new ApiService();

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getEpicsHierarchy(
        piName || undefined,
        teamName || undefined
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hierarchy data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Dynamically build columns from data - specific column order
  const columns = useMemo<ColumnConfig[]>(() => {
    // Define the exact columns in the order specified
    const columnOrder: { key: string; header: string; renderer: 'link' | 'badge' | 'text'; width?: { min?: number; max?: number } }[] = [
      { key: 'key', header: 'Key', renderer: 'link', width: { min: 120, max: 150 } },
      { key: 'Type', header: 'Type', renderer: 'badge', width: { min: 100, max: 120 } },
      { key: 'summary', header: 'Summary', renderer: 'text', width: { min: 400 } },
      { key: 'Status', header: 'Status', renderer: 'badge', width: { min: 100, max: 120 } },
      { key: 'Epic Progress %', header: 'Epic Progress %', renderer: 'text', width: { min: 80, max: 100 } },
      { key: 'Dependency', header: 'Dependency', renderer: 'badge', width: { min: 100 } },
      { key: 'Team Name', header: 'Team Name', renderer: 'text', width: { min: 150 } },
      { key: 'quarter_pi', header: 'Quarter PI', renderer: 'text', width: { min: 150 } },
      { key: '# Flagged Issues', header: '# Flagged Issues', renderer: 'text', width: { min: 120 } },
    ];

    // Build columns, checking if each field exists in the data
    const builtColumns: ColumnConfig[] = [];
    
    if (data.length > 0) {
      const firstItem = data[0];
      
      columnOrder.forEach(colDef => {
        // Check if the field exists in the data (try exact match first, then case-insensitive, then underscore variations)
        let fieldKey = Object.keys(firstItem).find(k => 
          k === colDef.key || k.toLowerCase() === colDef.key.toLowerCase()
        );
        
        // For quarter_pi, also try variations
        if (!fieldKey && colDef.key === 'quarter_pi') {
          fieldKey = Object.keys(firstItem).find(k => 
            k === 'quarter_pi' || 
            k === 'Quarter_PI' || 
            k === 'Quarter PI of Epic' ||
            k.toLowerCase().replace(/\s+/g, '_') === 'quarter_pi'
          );
        }
        
        if (fieldKey) {
          builtColumns.push({
            id: fieldKey,
            header: colDef.header,
            accessorKey: fieldKey,
            renderer: colDef.renderer,
            minWidth: colDef.width?.min,
            maxWidth: colDef.width?.max,
          });
        }
      });
    } else {
      // If no data, return column definitions anyway (for initial render)
      columnOrder.forEach(colDef => {
        builtColumns.push({
          id: colDef.key,
          header: colDef.header,
          accessorKey: colDef.key,
          renderer: colDef.renderer,
          minWidth: colDef.width?.min,
          maxWidth: colDef.width?.max,
        });
      });
    }

    return builtColumns;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
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
          
          <div className="w-full sm:w-[200px]">
            <label htmlFor="pi-name" className="block text-sm font-medium text-gray-700 mb-1">
              PI Name
            </label>
            <input
              id="pi-name"
              type="text"
              value={piName}
              onChange={(e) => setPiName(e.target.value)}
              placeholder="Enter PI name"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full sm:w-auto px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Apply Filters'}
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
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading hierarchy data...</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <HierarchyTable
          data={data}
          columns={columns}
          defaultExpanded={false}
          onRowClick={(item) => {
            console.log('Row clicked:', item);
            // You can add navigation or modal opening here
          }}
        />
      )}
    </div>
  );
}

