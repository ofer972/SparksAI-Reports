'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@/lib/api';
import { ActiveSprintSummaryItem } from '@/lib/config';
import ActiveSprintReportView from './ActiveSprintReportView';

interface ActiveSprintReportPageProps {
  selectedTreeValue?: string | null;
  selectedTreeLabel?: string;
  selectedTreeType?: 'group' | 'team';
  onTreeSelect?: (value: string | null, label: string, type: 'group' | 'team') => void;
}

export default function ActiveSprintReportPage({
  selectedTreeValue,
  selectedTreeLabel,
  selectedTreeType,
  onTreeSelect,
}: ActiveSprintReportPageProps) {
  const [data, setData] = useState<ActiveSprintSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({
    team_name: '',
    isGroup: false,
  });

  // Update filters when tree selection changes from top bar
  useEffect(() => {
    if (selectedTreeLabel) {
      setFilters((prev) => ({
        ...prev,
        team_name: selectedTreeLabel,
        isGroup: selectedTreeType === 'group',
      }));
    } else if (selectedTreeValue === null) {
      // Clear selection
      setFilters((prev) => ({
        ...prev,
        team_name: '',
        isGroup: false,
      }));
    }
  }, [selectedTreeLabel, selectedTreeType, selectedTreeValue]);

  const apiService = new ApiService();

  const fetchData = useCallback(async () => {
    const teamName = filters.team_name as string;
    const isGroup = (filters.isGroup as boolean) ?? false;

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
          endpoint: '/api/v1/reports/active-sprint-summary',
          teamName,
          isGroup
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetFilters = useCallback((updater: (prev: Record<string, any>) => Record<string, any>) => {
    setFilters(updater);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="h-full flex flex-col p-4">
      <ActiveSprintReportView
        data={data}
        loading={loading}
        error={error}
        filters={filters}
        setFilters={handleSetFilters}
        refresh={handleRefresh}
        meta={null}
        componentProps={{}}
      />
    </div>
  );
}

