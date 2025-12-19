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
import CycleTimeIssuesDialog from './CycleTimeIssuesDialog';
import { useTimeSeriesData } from '@/hooks/useTimeSeriesData';
import { useTimeSeriesChart } from '@/hooks/useTimeSeriesChart';
import { useTimeSeriesChartData } from '@/hooks/useTimeSeriesChartData';
import { useTimeSeriesFilterBadges } from '@/hooks/useTimeSeriesFilterBadges';
import type { CycleTimeDataPoint } from '@/lib/config';

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

interface CycleTimeFilters {
  months: number;
  team_name: string | null;
  isGroup: boolean;
}

interface CycleTimeViewProps {
  data: CycleTimeDataPoint[];
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
  filters: CycleTimeFilters;
  setFilters: (updater: (prev: CycleTimeFilters) => CycleTimeFilters) => void;
  refresh: () => void;
}

export default function CycleTimeView({
  data,
  meta,
  loading,
  error,
  filters,
  setFilters,
  refresh,
}: CycleTimeViewProps) {
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);
  const [aggregate, setAggregate] = useState<boolean>(false);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogPeriodStart, setDialogPeriodStart] = useState<string>('');
  const [dialogPeriodEnd, setDialogPeriodEnd] = useState<string>('');
  const [dialogIssueTypes, setDialogIssueTypes] = useState<string[]>([]);
  const chartRef = React.useRef<any>(null);

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
    valueField: 'avg_cycle_time',
    calculationType: 'weighted',
    countField: 'issue_count',
  });

  const chartData = useTimeSeriesChartData({
    groupedData,
    chartPeriods,
    selectedIssueTypes,
    availableIssueTypes,
    aggregate,
    chartType,
    formatPeriodLabel,
    aggregateLabel: 'Aggregated Cycle Time',
  });

  const chartOptions = useTimeSeriesChart({
    groupBy,
    chartType,
    chartPeriods,
    yAxisLabel: 'Cycle Time (days)',
    selectedIssueTypesCount: selectedIssueTypes.length || availableIssueTypes.length,
    aggregate,
    valueDecimals: 1,
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

  const calculatePeriodDates = useCallback((period: string, groupByType: 'day' | 'week' | 'month'): { start: string; end: string } => {
    const date = new Date(period);

    if (groupByType === 'day') {
      const dateStr = date.toISOString().split('T')[0];
      return { start: dateStr, end: dateStr };
    } else if (groupByType === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      };
    } else {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
      };
    }
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartData || !chartPeriods) return;

    const canvas = chart.canvas;
    if (!canvas) return;

    const handleClick = (event: MouseEvent) => {
      try {
        const elements = chart.getElementsAtEventForMode(
          event,
          'nearest',
          { intersect: true },
          false
        );

        if (!elements || elements.length === 0) return;

        const clickedElement = elements[0];
        const periodIndex = clickedElement.index;
        const datasetIndex = clickedElement.datasetIndex;

        if (periodIndex < 0 || periodIndex >= chartPeriods.length) return;

        const period = chartPeriods[periodIndex];
        const { start, end } = calculatePeriodDates(period, groupBy);

        let clickedIssueTypes: string[] = [];

        if (aggregate) {
          clickedIssueTypes = [...availableIssueTypes];
        } else {
          if (chartType === 'bar' && selectedIssueTypes.length > 1) {
            const clickedDataset = chartData.datasets[datasetIndex];
            const datasetLabel = clickedDataset?.label;
            if (datasetLabel && selectedIssueTypes.includes(datasetLabel)) {
              clickedIssueTypes = [datasetLabel];
            } else {
              clickedIssueTypes = selectedIssueTypes.length > 0 ? selectedIssueTypes : availableIssueTypes;
            }
          } else {
            clickedIssueTypes = selectedIssueTypes.length > 0 ? selectedIssueTypes : availableIssueTypes;
          }
        }

        if (clickedIssueTypes.length > 0) {
          setDialogPeriodStart(start);
          setDialogPeriodEnd(end);
          setDialogIssueTypes(clickedIssueTypes);
          setIsDialogOpen(true);
        }
      } catch (error) {
        console.error('Error handling chart click:', error);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [chartData, chartPeriods, groupBy, aggregate, selectedIssueTypes, availableIssueTypes, chartType, calculatePeriodDates]);

  return (
    <ReportCard
      title="Cycle Time"
      reportId="cycle-time-over-time"
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
        loadingMessage="Loading cycle time data..."
        chartRef={chartRef}
      />
      <CycleTimeIssuesDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        periodStart={dialogPeriodStart}
        periodEnd={dialogPeriodEnd}
        issuetypes={dialogIssueTypes}
        groupBy={groupBy}
        teamName={filters.team_name}
        isGroup={filters.isGroup}
      />
    </ReportCard>
  );
}

