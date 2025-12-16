/* Re-implemented Epics Hierarchy page using ReportCard, advanced filters, and
 * the new reports endpoint /api/v1/reports/issues-hierarchy.
 */
'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { HierarchyItem } from '@/lib/config';
import HierarchyTable from './HierarchyTable';
import type { ColumnConfig } from './types';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import MultiPIFilter from '../MultiPIFilter';
import IssueTypesHierarchyFilter from '../IssueTypesHierarchyFilter';
import { ApiService } from '@/lib/api';

export default function EpicsHierarchyPage() {
  const [data, setData] = useState<HierarchyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [piNames, setPiNames] = useState<string[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [hierarchyLevel, setHierarchyLevel] = useState<number | undefined>(undefined);
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);

  const apiService = useMemo(() => new ApiService(), []);

  // Fetch available PIs for the filter
  useEffect(() => {
    const fetchPIs = async () => {
      try {
        const response = await apiService.getPIs();
        if (response.pis) {
          const piNamesList = response.pis.map((pi) => pi.pi_name);
          setAvailablePIs(piNamesList);
        }
      } catch (err) {
        console.error('Error fetching PIs:', err);
      }
    };
    fetchPIs();
  }, [apiService]);

  // Fetch data from reports endpoint
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build PI parameter - can be array, single value, or undefined
      const piParam = piNames.length > 0 ? (piNames.length === 1 ? piNames[0] : piNames) : undefined;

      const result = await apiService.getEpicsHierarchy(
        piParam,
        teamName || undefined,
        isGroup,
        hierarchyLevel
      );
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hierarchy data';
      setError(errorMessage);
      setData([]);
      if (process.env.NODE_ENV === 'development') {
        console.error('Epics Hierarchy API Error:', {
          error: err,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [apiService, piNames, teamName, isGroup, hierarchyLevel]);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Normalize the data to ensure key/parent fields exist for the tree builder
  const normalizedIssues = useMemo<HierarchyItem[]>(() => {
    return data.map((issue: any) => ({
      ...issue,
      key: issue.Key || issue.key,
      parent: issue['Parent Key'] || issue['Parent'] || issue.parent || null,
    }));
  }, [data]);

  const handlePIsChange = useCallback((selectedPIs: string[]) => {
    setPiNames(selectedPIs);
  }, []);

  const handleTeamNameChange = useCallback(
    (value: string | null, type: 'group' | 'team', _name: string) => {
      setTeamName(value);
      // Reset isGroup when team is cleared, otherwise set based on type.
      if (!value) {
        setIsGroup(false);
      } else if (type === 'group') {
        setIsGroup(true);
      }
    },
    []
  );

  // Build columns from data (Key, Type, Quarter PI, Team Name, Summary, Status, Parent Progress, Dependency, Flagged Issues)
  const columns = useMemo<ColumnConfig[]>(() => {
    if (!normalizedIssues.length) {
      return [];
    }

    const firstRow = normalizedIssues[0];

    const columnsToShow: Array<{
      key: string;
      header: string;
      renderer?: 'link' | 'badge' | 'text';
      minWidth?: number;
      maxWidth?: number;
      size?: number;
    }> = [
      // Key (link)
      { key: 'Key', header: 'Key', renderer: 'link', minWidth: 60, maxWidth: 120, size: 80 },
      { key: 'key', header: 'Key', renderer: 'link', minWidth: 60, maxWidth: 120, size: 80 },
      // Type (badge)
      { key: 'Type', header: 'Type', renderer: 'badge', minWidth: 60, maxWidth: 120, size: 80 },
      { key: 'type', header: 'Type', renderer: 'badge', minWidth: 60, maxWidth: 120, size: 80 },
      // Quarter PI
      { key: 'quarter_pi', header: 'Quarter PI', minWidth: 60, maxWidth: 120, size: 80 },
      // Team Name
      { key: 'Team Name', header: 'Team Name', minWidth: 60, maxWidth: 120, size: 80 },
      { key: 'team_name', header: 'Team Name', minWidth: 60, maxWidth: 120, size: 80 },
      // Summary (flexible width, no max)
      { key: 'Issue Summary', header: 'Summary', renderer: 'text', minWidth: 200, size: 250 },
      { key: 'summary', header: 'Summary', renderer: 'text', minWidth: 200, size: 250 },
      // Status (badge)
      { key: 'Status', header: 'Status', renderer: 'badge', minWidth: 60, maxWidth: 120, size: 80 },
      { key: 'status', header: 'Status', renderer: 'badge', minWidth: 60, maxWidth: 120, size: 80 },
      // Parent Progress (Progress% field)
      { key: 'Progress%', header: 'Parent Progress', renderer: 'text', minWidth: 100, maxWidth: 120, size: 105 },
      { key: 'Progress (%)', header: 'Parent Progress', renderer: 'text', minWidth: 100, maxWidth: 120, size: 105 },
      // Dependency
      { key: 'Dependency', header: 'Dependency', renderer: 'badge', minWidth: 60, maxWidth: 80, size: 65 },
      // Flagged Issues
      { key: '# Flagged Issues', header: 'Flagged Issues', renderer: 'text', minWidth: 80, maxWidth: 100, size: 85 },
    ];

    const addedHeaders = new Set<string>();
    const builtColumns: ColumnConfig[] = [];

    columnsToShow.forEach((colDef) => {
      if (addedHeaders.has(colDef.header)) {
        return;
      }

      const fieldKey = Object.prototype.hasOwnProperty.call(firstRow, colDef.key) ? colDef.key : undefined;

      if (fieldKey) {
        addedHeaders.add(colDef.header);
        builtColumns.push({
          id: colDef.key,
          header: colDef.header,
          accessorKey: fieldKey,
          renderer: colDef.renderer,
          minWidth: colDef.minWidth,
          maxWidth: colDef.maxWidth,
          size: colDef.size,
        });
      }
    });

    return builtColumns;
  }, [normalizedIssues]);

  // Active filter badges shown under the header
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey?: string }[] = [];

    if (piNames.length > 0) {
      badges.push({
        label: 'PI',
        value: piNames.join(', '),
        filterKey: 'pi',
      });
    }

    if (teamName) {
      badges.push({
        label: 'Team',
        value: teamName,
        filterKey: 'team_name',
      });
    }

    if (hierarchyLevel !== undefined && hierarchyLevel !== null) {
      // Find the issue type name for the selected hierarchy level
      // Note: This would require fetching issue types, but for now just show the level number
      badges.push({
        label: 'Issue Type',
        value: `Level ${hierarchyLevel}`,
        filterKey: 'hierarchy_level',
      });
    }

    if (isGroup) {
      badges.push({
        label: 'Team Type',
        value: 'Group',
        filterKey: 'isGroup',
      });
    }

    return badges;
  }, [piNames, teamName, hierarchyLevel, isGroup]);

  // Filters row (PI first)
  const filterRow = (
    <ReportFiltersRow>
      <ReportFilterField label="PIs">
        <MultiPIFilter
          selectedPIs={piNames}
          onPIsChange={handlePIsChange}
          maxSelections={100}
          autoSelectFirst={false}
          pis={availablePIs}
        />
      </ReportFilterField>

      <ReportFilterField label="Team Name">
        <div className="flex items-center gap-2">
          <TeamGroupFilter
            value={teamName}
            onChange={handleTeamNameChange}
            placeholder="Select team"
            allowClear={true}
          />
          {teamName && (
            <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span>Group</span>
            </label>
          )}
        </div>
      </ReportFilterField>

      <ReportFilterField label="Issue Type Hierarchy Level">
        <IssueTypesHierarchyFilter
          value={hierarchyLevel}
          onChange={setHierarchyLevel}
          placeholder="All issue types"
          allowClear={true}
        />
      </ReportFilterField>

    </ReportFiltersRow>
  );

  return (
    <ReportCard
      title="Epics Hierarchy"
      filters={filterRow}
      filterBadges={filterBadges}
      onRefresh={fetchData}
      className="h-full"
    >
      {/* Error Message */}
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2">
              <h3 className="text-xs font-medium text-red-800">Error loading data</h3>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <p className="mt-3 text-gray-600 text-sm">Loading hierarchy data...</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <HierarchyTable
          data={normalizedIssues}
          columns={columns}
          defaultExpanded={false}
          showControls={false}
        />
      )}
    </ReportCard>
  );
}

