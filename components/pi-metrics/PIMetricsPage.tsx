'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';

interface MetricCardProps {
  title: string;
  tooltip: string;
  value?: string | number;
  loading?: boolean;
  icon?: React.ReactNode;
  color?: 'red' | 'yellow' | 'green';
}

function MetricCard({ title, tooltip, value, loading, icon, color }: MetricCardProps) {
  // Get color class based on status
  const getColorClass = () => {
    if (color === 'red') return 'text-red-600';
    if (color === 'yellow') return 'text-yellow-600';
    if (color === 'green') return 'text-green-600';
    return 'text-gray-900';
  };

  return (
    <div className="relative group flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col items-center justify-center min-h-[150px] min-w-[150px] max-w-[180px]">
      {/* Tooltip - appears on top */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
        <div className="relative">
          <div className="w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-normal">
            {tooltip}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </div>
      </div>

      {/* Icon at top */}
      {icon && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xl">
          {icon}
        </div>
      )}

      {/* Metric Value Area */}
      <div className="flex-1 flex items-center justify-center pt-2">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className={`text-3xl font-bold ${getColorClass()}`}>
            {value !== undefined ? value : '-'}
          </div>
        )}
      </div>

      {/* Title at bottom */}
      <div className="mt-auto pt-3 border-t border-gray-100 w-full">
        <h3 className="text-xs font-semibold text-gray-700 text-center">{title}</h3>
      </div>
    </div>
  );
}

export default function PIMetricsPage() {
  const [loading, setLoading] = useState(false);
  const [epicClosureData, setEpicClosureData] = useState<{
    value?: number;
    color?: 'red' | 'yellow' | 'green';
    totalIssue?: number;
    remainingEpics?: number;
    idealRemaining?: number;
  }>({});
  const [wipData, setWipData] = useState<{
    value?: number;
    color?: 'red' | 'yellow' | 'green';
    totalEpics?: number;
    percentage?: number;
  }>({});
  const [selectedPI, setSelectedPI] = useState<string>('Q32025');
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [piInput, setPiInput] = useState<string>('Q32025');

  // Fetch available PIs
  useEffect(() => {
    const apiService = new ApiService();
    const fetchPIs = async () => {
      try {
        const pis = await apiService.getPIs();
        if (pis.pis && pis.pis.length > 0) {
          const piNames = pis.pis.map(pi => pi.pi_name);
          setAvailablePIs(piNames);
        }
      } catch (err) {
        console.error('Failed to fetch PIs:', err);
      }
    };
    fetchPIs();
  }, []);

  // Fetch Epic Closure data for the first metric
  useEffect(() => {
    if (!selectedPI) return;
    
    const apiService = new ApiService();
    const fetchEpicClosure = async () => {
      setLoading(true);
      try {
        const response = await apiService.getPIStatusForToday(selectedPI);
        console.log('PI Status Response:', response);
        // Use the first item from the array, or aggregate if needed
        if (response.data && response.data.length > 0) {
          const firstItem = response.data[0];
          console.log('First item:', firstItem);
          // Extract fields from response
          const statusValue = firstItem['progress_delta_pct_status'];
          const progressValue = firstItem['progress_delta_pct'];
          console.log('Progress value:', progressValue, 'Status:', statusValue);
          setEpicClosureData({
            value: progressValue,
            color: statusValue,
            totalIssue: firstItem['total_issues'],
            remainingEpics: firstItem['remaining_epics'],
            idealRemaining: firstItem['ideal_remaining'],
          });
        } else {
          console.log('No data in response');
          setEpicClosureData({});
        }
      } catch (err) {
        console.error('Failed to fetch Epic Closure data:', err);
        setEpicClosureData({});
      } finally {
        setLoading(false);
      }
    };

    fetchEpicClosure();
  }, [selectedPI]);

  // Fetch WIP data for the last metric
  useEffect(() => {
    if (!selectedPI) return;
    
    const apiService = new ApiService();
    const fetchWIP = async () => {
      try {
        const data = await apiService.getPIWIP(selectedPI);
        setWipData({
          value: data.count_in_progress,
          color: data.count_in_progress_status,
          totalEpics: data.total_epics,
          percentage: data.in_progress_percentage,
        });
      } catch (err) {
        console.error('Failed to fetch WIP data:', err);
        setWipData({});
      }
    };

    fetchWIP();
  }, [selectedPI]);

  const metrics = [
    {
      title: 'Epic Closure',
      tooltip: epicClosureData.totalIssue !== undefined && epicClosureData.remainingEpics !== undefined && epicClosureData.idealRemaining !== undefined
        ? `Closure gap from the ideal. Total issues: ${epicClosureData.totalIssue}. Remaining epics: ${epicClosureData.remainingEpics}. Ideal remaining: ${epicClosureData.idealRemaining}`
        : 'Closure gap from the ideal.',
      value: epicClosureData.value !== undefined && epicClosureData.value !== null 
        ? `${epicClosureData.value.toFixed(1)}%` 
        : undefined,
      color: epicClosureData.color,
      icon: '📉',
    },
    {
      title: 'Dependencies',
      tooltip: 'Top three teams with the most dependencies in the PI',
      value: undefined,
      icon: '🔗',
    },
    {
      title: 'Average Epic Cycle Time',
      tooltip: 'Average cycle time of EPIC in the last three PIs',
      value: undefined,
      icon: '⏱️',
    },
    {
      title: 'PI Predictability',
      tooltip: 'Average PI predictability in the last three PIs',
      value: undefined,
      icon: '📊',
    },
    {
      title: 'In Progress Epics',
      tooltip: wipData.totalEpics !== undefined && wipData.value !== undefined && wipData.percentage !== undefined
        ? `Total epics: ${wipData.totalEpics}. Currently in progress: ${wipData.value} (${wipData.percentage.toFixed(1)}%)`
        : 'Number of epics that are in progress in the PI',
      value: wipData.value !== undefined && wipData.value !== null 
        ? wipData.value 
        : undefined,
      color: wipData.color,
      icon: '🚀',
    },
  ];

  const handleApplyFilter = async () => {
    const piName = piInput.trim();
    if (piName) {
      setSelectedPI(piName);
      // Manually trigger fetch for Epic Closure and WIP
      setLoading(true);
      try {
        const apiService = new ApiService();
        
        // Fetch Epic Closure
        const response = await apiService.getPIStatusForToday(piName);
        console.log('PI Status Response (from Apply):', response);
        if (response.data && response.data.length > 0) {
          const firstItem = response.data[0];
          console.log('First item (from Apply):', firstItem);
          // Extract fields from response
          const statusValue = firstItem['progress_delta_pct_status'];
          const progressValue = firstItem['progress_delta_pct'];
          console.log('Progress value (from Apply):', progressValue, 'Status:', statusValue);
          setEpicClosureData({
            value: progressValue,
            color: statusValue,
            totalIssue: firstItem['total_issues'],
            remainingEpics: firstItem['remaining_epics'],
            idealRemaining: firstItem['ideal_remaining'],
          });
        } else {
          console.log('No data in response (from Apply)');
          setEpicClosureData({});
        }

        // Fetch WIP
        const wipResponse = await apiService.getPIWIP(piName);
        setWipData({
          value: wipResponse.count_in_progress,
          color: wipResponse.count_in_progress_status,
          totalEpics: wipResponse.total_epics,
          percentage: wipResponse.in_progress_percentage,
        });
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setEpicClosureData({});
        setWipData({});
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[300px]">
            <label htmlFor="pi-name-filter" className="block text-sm font-medium text-gray-700 mb-1">
              PI Name
            </label>
            <div className="flex gap-2">
              <input
                id="pi-name-filter"
                type="text"
                value={piInput}
                onChange={(e) => setPiInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilter();
                  }
                }}
                placeholder="Enter PI name"
                list="pi-names-list"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {availablePIs.length > 0 && (
                <datalist id="pi-names-list">
                  {availablePIs.map((pi) => (
                    <option key={pi} value={pi} />
                  ))}
                </datalist>
              )}
            </div>
          </div>

          <div>
            <button
              onClick={handleApplyFilter}
              disabled={loading || !piInput.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">PI Metrics</h2>
        
        {/* Metrics Grid - Responsive: 2 per row on mobile, all in one row on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              tooltip={metric.tooltip}
              value={metric.value}
              loading={loading && index === 0}
              icon={metric.icon}
              color={metric.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

