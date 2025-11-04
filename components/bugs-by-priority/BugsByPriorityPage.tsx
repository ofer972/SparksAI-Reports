'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { IssueByPriority } from '@/lib/config';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

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
  const processedData = data.reduce((acc, item) => {
    const existing = acc.find(p => p.priority.toLowerCase() === item.priority.toLowerCase());
    if (existing) {
      existing.issue_count += item.issue_count;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as IssueByPriority[]);

  // Generate dynamic colors for priorities
  const generateColors = (count: number): { background: string[], border: string[] } => {
    // Color palette with distinct colors
    const colorPalette = [
      { bg: 'rgba(153, 27, 27, 0.8)', border: 'rgba(153, 27, 27, 1)' },    // Dark Red
      { bg: 'rgba(251, 191, 36, 0.8)', border: 'rgba(251, 191, 36, 1)' },   // Yellow/Amber
      { bg: 'rgba(125, 211, 252, 0.8)', border: 'rgba(125, 211, 252, 1)' }, // Light Blue
      { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' },  // Blue
      { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgba(168, 85, 247, 1)' },  // Purple
      { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgba(236, 72, 153, 1)' },   // Pink
      { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },  // Orange
      { bg: 'rgba(20, 184, 166, 0.8)', border: 'rgba(20, 184, 166, 1)' },  // Teal
      { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' },  // Indigo
      { bg: 'rgba(14, 165, 233, 0.8)', border: 'rgba(14, 165, 233, 1)' },  // Sky
    ];

    const backgroundColors: string[] = [];
    const borderColors: string[] = [];

    for (let i = 0; i < count; i++) {
      // Use modulo to cycle through colors if we have more priorities than colors
      const colorIndex = i % colorPalette.length;
      backgroundColors.push(colorPalette[colorIndex].bg);
      borderColors.push(colorPalette[colorIndex].border);
    }

    return { background: backgroundColors, border: borderColors };
  };

  // Generate colors dynamically based on number of priorities
  const colors = generateColors(processedData.length);

  // Prepare chart data
  const chartData = {
    labels: processedData.map(item => item.priority),
    datasets: [
      {
        label: 'Number of Bugs',
        data: processedData.map(item => item.issue_count),
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
      datalabels: {
        display: true,
        color: '#000000',
        font: {
          weight: 'bold' as const,
          size: 13,
        },
        formatter: (value: number) => {
          return value.toString();
        },
      },
    },
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

      {/* Chart */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Bugs by Priority</h2>
          <div className="h-72 w-full max-w-[450px]">
            {processedData.length > 0 ? (
              <Pie data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

