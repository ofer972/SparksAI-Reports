'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { StatusDuration, IssueStatusDurationIssue, getCleanJiraUrl } from '@/lib/config';
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

export default function FlowStatusDurationPage() {
  const [data, setData] = useState<StatusDuration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [issueType, setIssueType] = useState('');
  const [teamName, setTeamName] = useState('AutoDesign-Dev');
  const [period, setPeriod] = useState<number>(3);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalIssues, setModalIssues] = useState<IssueStatusDurationIssue[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const apiService = new ApiService();

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getIssueStatusDuration(
        issueType || undefined,
        teamName || undefined,
        period
      );
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status duration data';
      setError(`${errorMessage}. Check browser console for details.`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount and when period changes
  useEffect(() => {
    fetchData();
  }, [period]);

  // Prepare chart data
  const chartData = {
    labels: data.map(item => item.status_name),
    datasets: [
      {
        label: 'Average Days',
        data: data.map(item => item.avg_duration_days),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Handle bar click
  const handleBarClick = async (statusName: string) => {
    setSelectedStatus(statusName);
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalIssues([]);
    
    try {
      const issues = await apiService.getIssueStatusDurationWithKeys(
        statusName,
        issueType || undefined,
        teamName || undefined,
        period
      );
      setModalIssues(issues);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to fetch issue details');
    } finally {
      setModalLoading(false);
    }
  };

  // Open Jira issue
  const openJiraIssue = (issueKey: string) => {
    const cleanJiraUrl = getCleanJiraUrl();
    const jiraLink = `${cleanJiraUrl}/browse/${issueKey}`;
    window.open(jiraLink, '_blank');
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const element = elements[0];
        const index = element.index;
        const statusName = data[index]?.status_name;
        if (statusName) {
          handleBarClick(statusName);
        }
      }
    },
    onHover: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        event.native.target.style.cursor = 'pointer';
      } else {
        event.native.target.style.cursor = 'default';
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Average Days in Transition Status (In Progress Category) - Click a bar to view issues',
        font: {
          size: 14,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y.toFixed(1)} days (Click to view issues)`;
          },
        },
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: number) => {
          return value.toFixed(1);
        },
        font: {
          size: 12,
          weight: 'bold' as const,
        },
        color: '#374151',
        padding: {
          top: 4,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average Days',
          font: {
            size: 12,
          },
        },
        ticks: {
          callback: (value: any) => {
            return value.toFixed(0);
          },
        },
      },
      x: {
        title: {
          display: true,
          text: 'Status Name',
          font: {
            size: 12,
          },
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 13,
            weight: 'bold' as const,
          },
        },
      },
    },
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[200px]">
            <label htmlFor="issue-type" className="block text-sm font-medium text-gray-700 mb-1">
              Issue Type
            </label>
            <input
              id="issue-type"
              type="text"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              placeholder="Enter issue type"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-[200px]">
            <label htmlFor="team-name-flow" className="block text-sm font-medium text-gray-700 mb-1">
              Team Name
            </label>
            <input
              id="team-name-flow"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-[200px]">
            <label htmlFor="time-period-flow" className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              id="time-period-flow"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>Last 3 Months</option>
              <option value={4}>Last 4 Months</option>
              <option value={6}>Last 6 Months</option>
            </select>
          </div>

          <div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

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
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading status duration data...</p>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="h-96 w-[60%]">
            {data.length > 0 ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setModalOpen(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Issues for Status: {selectedStatus}
                  </h3>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                {modalLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading issues...</p>
                  </div>
                ) : modalError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">{modalError}</p>
                  </div>
                ) : modalIssues.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No issues found for this status
                  </div>
                ) : (
                  <div className="border-2 border-gray-400 rounded-md" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-r border-gray-400">
                            Issue Key
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-r border-gray-400">
                            Summary
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-400">
                            Average Duration (Days)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {modalIssues.map((issue, index) => (
                          <tr key={`${issue.issue_key}-${index}`} className="hover:bg-gray-50 border-b border-gray-300">
                            <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-300">
                              <button
                                onClick={() => openJiraIssue(issue.issue_key)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
                              >
                                {issue.issue_key}
                              </button>
                            </td>
                            <td className="px-2 py-1.5 text-sm text-gray-900 border-r border-gray-300">
                              {issue.issue_summary}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                              {issue.duration_days.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

