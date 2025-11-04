'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { IssuesByTeam } from '@/lib/config';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface BugsByTeamBarChartProps {
  onError?: (error: string) => void;
}

export default function BugsByTeamBarChart({ onError }: BugsByTeamBarChartProps) {
  const [data, setData] = useState<IssuesByTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = new ApiService();

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Always pass 'Bug' as the issue_type parameter
      const result = await apiService.getIssuesByTeam('Bug');
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bugs by team data';
      setError(errorMessage);
      setData([]);
      
      if (onError) {
        onError(errorMessage);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Bugs by Team API Error:', {
          error: err,
          endpoint: '/api/v1/issues/issues-grouped-by-team',
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

  // Get all unique priorities across all teams
  const getAllPriorities = (): string[] => {
    const prioritySet = new Set<string>();
    data.forEach(team => {
      team.priorities.forEach(p => {
        prioritySet.add(p.priority);
      });
    });
    return Array.from(prioritySet).sort();
  };

  // Generate color for priority (same as pie chart)
  const getPriorityColor = (priority: string, allPriorities: string[]): string => {
    const colorPalette = [
      'rgba(153, 27, 27, 0.8)',    // Dark Red
      'rgba(251, 191, 36, 0.8)',   // Yellow/Amber
      'rgba(125, 211, 252, 0.8)',  // Light Blue
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(168, 85, 247, 0.8)',   // Purple
      'rgba(236, 72, 153, 0.8)',   // Pink
      'rgba(249, 115, 22, 0.8)',   // Orange
      'rgba(20, 184, 166, 0.8)',   // Teal
      'rgba(139, 92, 246, 0.8)',   // Indigo
      'rgba(14, 165, 233, 0.8)',   // Sky
    ];
    const index = allPriorities.indexOf(priority);
    return colorPalette[index % colorPalette.length];
  };

  // Prepare chart data for stacked bar chart
  const prepareChartData = () => {
    const allPriorities = getAllPriorities();
    const teamNames = data.map(team => team.team_name);

    // Create datasets for each priority
    const datasets = allPriorities.map(priority => {
      const priorityData = teamNames.map(teamName => {
        const team = data.find(t => t.team_name === teamName);
        const priorityItem = team?.priorities.find(p => p.priority === priority);
        return priorityItem?.issue_count || 0;
      });

      return {
        label: priority,
        data: priorityData,
        backgroundColor: getPriorityColor(priority, allPriorities),
        borderColor: getPriorityColor(priority, allPriorities).replace('0.8', '1'),
        borderWidth: 1,
      };
    });

    return {
      labels: teamNames,
      datasets,
    };
  };

  const chartData = prepareChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            return `${label}: ${value}`;
          },
        },
      },
      datalabels: {
        display: true,
        color: '#000000',
        font: {
          weight: 'bold' as const,
          size: 11,
        },
        formatter: (value: number) => {
          return value > 0 ? value.toString() : '';
        },
        anchor: 'center' as const,
        align: 'center' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading bugs by team data...</p>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bugs by Team</h2>
        <div className="h-72 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Bugs by Team</h2>
      <div className="h-72 w-full">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

