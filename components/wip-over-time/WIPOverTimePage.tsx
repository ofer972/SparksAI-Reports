'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import type { WIPOverTimeDataPoint, WIPOverTimeResponse } from '@/lib/config';
import WIPOverTimeView from './WIPOverTimeView';

export default function WIPOverTimePage() {
  const [data, setData] = useState<WIPOverTimeDataPoint[]>([]);
  const [meta, setMeta] = useState<WIPOverTimeResponse['data']['meta']>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    months: number;
    team_name: string | null;
    isGroup: boolean;
  }>({
    months: 6,
    team_name: null,
    isGroup: false,
  });

  const apiService = useMemo(() => new ApiService(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result: WIPOverTimeResponse = await apiService.getWIPOverTime(
        filters.months,
        filters.team_name || undefined,
        filters.isGroup
      );

      if (result.success && result.data && Array.isArray(result.data.result)) {
        setData(result.data.result);
        setMeta(result.data.meta);
      } else {
        setData([]);
        setMeta(undefined);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch WIP over time data';
      setError(errorMessage);
      setData([]);
      if (process.env.NODE_ENV === 'development') {
        console.error('WIP Over Time API Error:', {
          error: err,
          endpoint: '/api/v1/reports/wip-over-time',
          filters,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [apiService, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="h-full flex flex-col p-4">
      <WIPOverTimeView
        data={data}
        meta={meta}
        loading={loading}
        error={error}
        filters={filters}
        setFilters={setFilters}
        refresh={fetchData}
      />
    </div>
  );
}

