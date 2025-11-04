'use client';

import { useState, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { IssuesByTeam } from '@/lib/config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

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
  const getAllPriorities = useMemo(() => {
    const prioritySet = new Set<string>();
    data.forEach(team => {
      team.priorities.forEach(p => {
        prioritySet.add(p.priority);
      });
    });
    return Array.from(prioritySet).sort();
  }, [data]);

  // Color palette (same as pie chart)
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

  const getPriorityColor = (priority: string): string => {
    const index = getAllPriorities.indexOf(priority);
    return colorPalette[index % colorPalette.length];
  };

  // Prepare chart data for stacked bar chart
  const chartData = useMemo(() => {
    return data.map(team => {
      const teamData: any = {
        team_name: team.team_name,
        total_issues: team.total_issues,
      };
      
      getAllPriorities.forEach(priority => {
        const priorityItem = team.priorities.find(p => p.priority === priority);
        teamData[priority] = priorityItem?.issue_count || 0;
      });
      
      return teamData;
    });
  }, [data, getAllPriorities]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.team_name}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value > 0) {
              return (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: {entry.value}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
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
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="team_name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
            />
            {getAllPriorities.map((priority, index) => (
              <Bar
                key={priority}
                dataKey={priority}
                stackId="a"
                fill={getPriorityColor(priority)}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={priority}
                  position="center"
                  fill="black"
                  content={(props: any) => {
                    const { value, x, y, width, height, payload, index: dataIndex } = props;
                    if (!value || value === 0) {
                      return null;
                    }
                    
                    // Access the full data entry to get total_issues
                    const teamData = chartData[dataIndex];
                    const teamTotal = teamData?.total_issues || 0;
                    const percentage = teamTotal > 0 ? ((value / teamTotal) * 100).toFixed(1) : '0';
                    
                    return (
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        fill="#000000"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight="bold"
                      >
                        {value} ({percentage}%)
                      </text>
                    );
                  }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
