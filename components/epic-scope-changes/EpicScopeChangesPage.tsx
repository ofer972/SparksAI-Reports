'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ApiService } from '@/lib/api';
import { ScopeChangesDataPoint } from '@/lib/config';
import MultiPIFilter from '../MultiPIFilter';
import StackedGroupedBarChart, {
  StackedGroupedBarChartData,
} from '../StackedGroupedBarChart';

const epicScopeColors = {
  'Issues Planned': '#0066cc',
  'Issues Added': '#800080',
  'Issues Completed': '#009900',
  'Issues Not Completed': '#ff8c00',
  'Issues Removed': '#00ffff',
};

type ScopeMetricKey = `${string}|${string}`;

const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const parseIssueKeys = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((key) => (typeof key === 'string' ? key.trim() : String(key).trim()))
      .filter((key) => key.length > 0);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);
  }
  return [];
};

export default function EpicScopeChangesPage() {
  const [data, setData] = useState<ScopeChangesDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const hasAutoSelectedRef = useRef(false);

  const apiService = new ApiService();

  // Fetch available PIs
  useEffect(() => {
    const fetchPIs = async () => {
      try {
        const response = await apiService.getPIs();
        if (response.pis) {
          const piNames = response.pis.map(pi => pi.pi_name);
          setAvailablePIs(piNames);
          
          // Auto-select all PIs if none selected and we haven't auto-selected yet
          if (selectedPIs.length === 0 && piNames.length > 0 && !hasAutoSelectedRef.current) {
            hasAutoSelectedRef.current = true;
            setSelectedPIs(piNames);
          }
        }
      } catch (err) {
        console.error('Error fetching PIs:', err);
      }
    };
    fetchPIs();
  }, []);

  // Fetch scope changes data
  const fetchData = useCallback(async () => {
    if (selectedPIs.length === 0) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getScopeChanges(selectedPIs);
      setData(result.scope_data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scope changes data';
      setError(`${errorMessage}. Check browser console for details.`);
      setData([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Epic Scope Changes API Error:', {
          error: err,
          selectedPIs
        });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPIs]);

  // Fetch data when selectedPIs changes
  useEffect(() => {
    if (selectedPIs.length > 0) {
      fetchData();
    }
  }, [fetchData]);

  const handlePIsChange = useCallback(
    (values: string[]) => {
      if (arraysEqual(values, selectedPIs)) {
        return;
      }
      setSelectedPIs(values);
    },
    [selectedPIs]
  );

  const aggregatedData = useMemo((): StackedGroupedBarChartData[] => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const map = new Map<ScopeMetricKey, {
      quarter: string;
      metricName: string;
      value: number;
      issueKeys: Set<string>;
    }>();

    data.forEach((item) => {
      const quarter = item['Quarter Name'];
      const metricName = item['Metric Name'];
      const rawIssueKeys = item['Issue Keys'] ?? (item as any).issue_keys ?? (item as any).issueKeys ?? '';
      const issueKeys = parseIssueKeys(rawIssueKeys);
      const value = Number(item.Value) || 0;
      const key: ScopeMetricKey = `${quarter}|${metricName}`;

      if (!map.has(key)) {
        map.set(key, {
          quarter,
          metricName,
          value,
          issueKeys: new Set(issueKeys),
        });
      } else {
        const existing = map.get(key)!;
        existing.value += value;
        issueKeys.forEach((issueKey) => existing.issueKeys.add(issueKey));
      }
    });

    return Array.from(map.values()).map((entry) => ({
      quarter: entry.quarter,
      stackGroup: 'aggregate',
      metricName: entry.metricName,
      value: entry.value,
      issueKeys: Array.from(entry.issueKeys),
    }));
  }, [data]);

  const showChart = !loading && !error && selectedPIs.length > 0 && aggregatedData.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Epic Scope Changes</h1>
        
        {/* PI Filter */}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-gray-700">PI Selection:</label>
          <MultiPIFilter
            selectedPIs={selectedPIs}
            onPIsChange={handlePIsChange}
            maxSelections={100}
            autoSelectFirst={false}
            pis={availablePIs}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-gray-600">Loading scope changes...</div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && selectedPIs.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select at least one PI to view scope changes.
          </div>
        )}

        {showChart && (
          <div className="w-full h-full flex-1 relative min-h-[350px]">
            <StackedGroupedBarChart
              data={aggregatedData}
              title="Epic Scope Changes"
              yAxisLabel="# of Epics"
              xAxisLabel="Quarter"
              colorScheme={epicScopeColors}
              loading={false}
              error={null}
            />
          </div>
        )}

        {!loading && !error && selectedPIs.length > 0 && aggregatedData.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No scope changes found for the selected quarters.
          </div>
        )}
      </div>
    </div>
  );
}

