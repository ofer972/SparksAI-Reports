'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@/lib/api';
import { ClosedSprint } from '@/lib/config';
import TeamVelocityChartAdvancedView from './TeamVelocityChartAdvancedView';

interface TeamVelocityChartAdvancedPageProps {
  selectedTreeValue?: string | null;
  selectedTreeLabel?: string;
  selectedTreeType?: 'group' | 'team';
  onTreeSelect?: (value: string | null, label: string, type: 'group' | 'team') => void;
}

export default function TeamVelocityChartAdvancedPage({
  selectedTreeValue,
  selectedTreeLabel,
  selectedTreeType,
  onTreeSelect,
}: TeamVelocityChartAdvancedPageProps) {
  const [data, setData] = useState<ClosedSprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [averageVelocity, setAverageVelocity] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({
    team_name: '',
    months: 2,
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
    const months = Number(filters.months ?? 2);
    const isGroup = (filters.isGroup as boolean) ?? false;

    if (!teamName) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getSprintVelocityAdvanced(teamName, months, isGroup);

      // New endpoint returns data as array directly with meta
      if (result.data && Array.isArray(result.data)) {
        setData(result.data);
        setAverageVelocity(result.meta?.average_velocity ?? null);
      } else {
        setData([]);
        setAverageVelocity(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch closed sprints data';
      setError(`${errorMessage}. Check browser console for details.`);
      setData([]);

      if (process.env.NODE_ENV === 'development') {
        console.error('Closed Sprints API Error:', {
          error: err,
          teamName,
          months,
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
      <TeamVelocityChartAdvancedView
        data={data}
        loading={loading}
        error={error}
        filters={filters}
        setFilters={handleSetFilters}
        refresh={handleRefresh}
        meta={{ averageVelocity }}
        componentProps={{}}
      />
    </div>
  );
}







