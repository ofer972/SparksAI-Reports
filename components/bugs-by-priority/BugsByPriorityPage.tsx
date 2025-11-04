'use client';

import { useState, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { IssueByPriority } from '@/lib/config';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import BugsByTeamBarChart from './BugsByTeamBarChart';

export default function BugsByPriorityPage() {
  const [data, setData] = useState<IssueByPriority[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = new ApiService();

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Always pass 'Bug' as the issue_type parameter
      const result = await apiService.getIssuesByPriority('Bug');
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bugs by priority data';
      setError(`${errorMessage}. Check browser console for details.`);
      setData([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Bugs by Priority API Error:', {
          error: err,
          endpoint: '/api/v1/issues/issues-grouped-by-priority',
          issue_type: 'Bug'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Deduplicate and merge priorities with the same name
  const processedData = useMemo(() => {
    return data.reduce((acc, item) => {
      const existing = acc.find(p => p.priority.toLowerCase() === item.priority.toLowerCase());
      if (existing) {
        existing.issue_count += item.issue_count;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as IssueByPriority[]);
  }, [data]);

  // Generate dynamic colors for priorities
  const colorPalette = [
    '#991b1b',    // Dark Red
    '#fbbf24',    // Yellow/Amber
    '#7dd3fc',    // Light Blue
    '#3b82f6',    // Blue
    '#a855f7',    // Purple
    '#ec4899',    // Pink
    '#f97316',    // Orange
    '#14b8a6',    // Teal
    '#8b5cf6',    // Indigo
    '#0ea5e9',    // Sky
  ];

  const getColor = (index: number) => {
    return colorPalette[index % colorPalette.length];
  };

  // Prepare chart data for Recharts
  const chartData = useMemo(() => {
    const total = processedData.reduce((sum, item) => sum + item.issue_count, 0);
    return processedData.map((item, index) => ({
      name: item.priority,
      value: item.issue_count,
      percentage: total > 0 ? ((item.issue_count / total) * 100).toFixed(1) : '0',
      color: getColor(index),
    }));
  }, [processedData]);

  // Custom label function for external labels with connectors
  const renderCustomLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, value, name
  }: any) => {
    const RADIAN = Math.PI / 180;
    // Start connector from outer edge of pie (not from middle) - this makes connector shorter
    const x = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const y = cy + outerRadius * Math.sin(-midAngle * RADIAN);
    // Label position - make connector SHORT by keeping label close to pie edge
    const labelX = cx + (outerRadius + 8) * Math.cos(-midAngle * RADIAN);
    const labelY = cy + (outerRadius + 8) * Math.sin(-midAngle * RADIAN);
    const percentage = (percent * 100).toFixed(1);

    return (
      <g>
        {/* Connector line - SHORT because it starts from pie edge and label is close */}
        <line
          x1={x}
          y1={y}
          x2={labelX}
          y2={labelY}
          stroke="#374151"
          strokeWidth={1}
        />
        {/* Label text */}
        <text
          x={labelX}
          y={labelY}
          fill="#000000"
          textAnchor={labelX > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={13}
          fontWeight="bold"
        >
          {value} ({percentage}%)
        </text>
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
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
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading bugs by priority data...</p>
        </div>
      )}

      {/* Charts */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Bugs by Priority</h2>
            <div className="h-72 w-full max-w-[450px]">
              {processedData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Bar Chart */}
          <BugsByTeamBarChart />
        </div>
      )}
    </div>
  );
}
