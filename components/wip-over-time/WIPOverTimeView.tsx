'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  BarController,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import ReportCard from '../reporting/ReportCard';
import TimeSeriesFilters from '../time-series/TimeSeriesFilters';
import TimeSeriesChartContainer from '../time-series/TimeSeriesChartContainer';
import { useTimeSeriesData } from '@/hooks/useTimeSeriesData';
import { useTimeSeriesChart } from '@/hooks/useTimeSeriesChart';
import { useTimeSeriesChartData } from '@/hooks/useTimeSeriesChartData';
import { useTimeSeriesFilterBadges } from '@/hooks/useTimeSeriesFilterBadges';
import type { WIPOverTimeDataPoint } from '@/lib/config';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  BarController,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface WIPOverTimeFilters {
  months: number;
  team_name: string | null;
  isGroup: boolean;
}

interface WIPOverTimeViewProps {
  data: WIPOverTimeDataPoint[];
  meta?: {
    months: number;
    days_back: number;
    isGroup: boolean;
    count: number;
    available_teams?: string[];
    available_issue_types?: string[];
    team_name: string | null;
  };
  loading: boolean;
  error: string | null;
  filters: WIPOverTimeFilters;
  setFilters: (updater: (prev: WIPOverTimeFilters) => WIPOverTimeFilters) => void;
  refresh: () => void;
}

export default function WIPOverTimeView({
  data,
  meta,
  loading,
  error,
  filters,
  setFilters,
  refresh,
}: WIPOverTimeViewProps) {
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);
  const [aggregate, setAggregate] = useState<boolean>(false);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');

  const availableIssueTypes = useMemo(() => {
    if (meta?.available_issue_types && meta.available_issue_types.length > 0) {
      return [...meta.available_issue_types].sort();
    }
    const types = Array.from(new Set(data.map(d => d.issuetype))).sort();
    return types;
  }, [meta?.available_issue_types, data]);

  useEffect(() => {
    if (availableIssueTypes.length > 0) {
      const validSelected = selectedIssueTypes.filter(type => availableIssueTypes.includes(type));
      if (validSelected.length !== selectedIssueTypes.length || selectedIssueTypes.length === 0) {
        setSelectedIssueTypes([...availableIssueTypes]);
      }
    } else {
      setSelectedIssueTypes([]);
    }
  }, [availableIssueTypes, selectedIssueTypes]);

  const { groupedData, chartPeriods, formatPeriodLabel } = useTimeSeriesData({
    data,
    groupBy,
    selectedIssueTypes,
    aggregate,
    valueField: 'work_in_progress',
  });

  const chartData = useTimeSeriesChartData({
    groupedData,
    chartPeriods,
    selectedIssueTypes,
    availableIssueTypes,
    aggregate,
    chartType,
    formatPeriodLabel,
    aggregateLabel: 'Aggregated WIP',
  });

  const chartOptions = useTimeSeriesChart({
    groupBy,
    chartType,
    chartPeriods,
    yAxisLabel: 'Work in Progress',
    selectedIssueTypesCount: selectedIssueTypes.length || availableIssueTypes.length,
    aggregate,
  });

  const handleTimePeriodChange = useCallback((months: number) => {
    setFilters(prev => ({ ...prev, months }));
  }, [setFilters]);

  const handleTeamChange = useCallback((value: string | null, type: 'group' | 'team', _name: string) => {
    setFilters(prev => ({
      ...prev,
      team_name: value,
      isGroup: type === 'group',
    }));
  }, [setFilters]);

  const handleIsGroupChange = useCallback((checked: boolean) => {
    setFilters(prev => ({ ...prev, isGroup: checked }));
  }, [setFilters]);

  const filterBadges = useTimeSeriesFilterBadges({
    filters,
    selectedIssueTypes,
    aggregate,
    groupBy,
    chartType,
  });

  return (
    <ReportCard
      title="WIP Over Time"
      reportId="wip-over-time"
      filters={
        <TimeSeriesFilters
          months={filters.months}
          teamName={filters.team_name}
          isGroup={filters.isGroup}
          onMonthsChange={handleTimePeriodChange}
          onTeamChange={handleTeamChange}
          onIsGroupChange={handleIsGroupChange}
          selectedIssueTypes={selectedIssueTypes}
          availableIssueTypes={availableIssueTypes}
          onIssueTypesChange={setSelectedIssueTypes}
          aggregate={aggregate}
          onAggregateChange={setAggregate}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          chartType={chartType}
          onChartTypeChange={setChartType}
        />
      }
      filterBadges={filterBadges}
      onRefresh={refresh}
      defaultCollapsed={false}
    >
      <TimeSeriesChartContainer
        loading={loading}
        error={error}
        chartData={chartData}
        chartType={chartType}
        chartOptions={chartOptions}
        loadingMessage="Loading WIP data..."
      />
    </ReportCard>
  );
}
