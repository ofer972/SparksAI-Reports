'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import type { CycleTimeDataPoint, CycleTimeResponse } from '@/lib/config';
import CycleTimeView from './CycleTimeView';

export default function CycleTimePage() {
  const [data, setData] = useState<CycleTimeDataPoint[]>([]);
  const [meta, setMeta] = useState<CycleTimeResponse['data']['meta']>(undefined);
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
      const result: CycleTimeResponse = await apiService.getCycleTime(
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cycle time data';
      setError(errorMessage);
      setData([]);
      if (process.env.NODE_ENV === 'development') {
        console.error('Cycle Time API Error:', {
          error: err,
          endpoint: '/api/v1/reports/cycle-time',
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
      <CycleTimeView
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

