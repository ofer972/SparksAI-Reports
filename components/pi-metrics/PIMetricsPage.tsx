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
  remainingEpics?: number;
  idealRemaining?: number;
  totalEpics?: number;
  inProgressPercentage?: number;
}

function MetricCard({ title, tooltip, value, loading, icon, color, remainingEpics, idealRemaining, totalEpics, inProgressPercentage }: MetricCardProps) {
  // Get color class based on status
  const getColorClass = () => {
    if (color === 'red') return 'text-red-600';
    if (color === 'yellow') return 'text-yellow-600';
    if (color === 'green') return 'text-green-600';
    return 'text-gray-900';
  };

  return (
    <div className="relative group flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col items-center justify-center min-h-[135px] min-w-[150px] max-w-[180px]">
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

      {/* Icon at top or Epic Closure info or In Progress Epics info */}
      {remainingEpics !== undefined || idealRemaining !== undefined ? (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 text-center">
          <div className="whitespace-nowrap">
            Remaining: {remainingEpics !== undefined ? remainingEpics : '-'}, Ideal: {idealRemaining !== undefined ? idealRemaining : '-'}
          </div>
        </div>
      ) : totalEpics !== undefined || inProgressPercentage !== undefined ? (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 text-center">
          <div className="whitespace-nowrap">
            Total Epics: {totalEpics !== undefined ? totalEpics : '-'}, WIP%: {inProgressPercentage !== undefined ? Math.round(inProgressPercentage) : '-'}
          </div>
        </div>
      ) : icon ? (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-lg">
          {icon}
        </div>
      ) : null}

      {/* Metric Value Area */}
      <div className="flex-1 flex items-center justify-center pt-6">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className={`text-xl font-bold ${getColorClass()}`}>
            {value !== undefined ? value : '-'}
          </div>
        )}
      </div>

      {/* Title at bottom */}
      <div className="mt-auto pt-2 w-full">
        <h3 className="text-[0.65rem] font-semibold text-gray-700 text-center">{title}</h3>
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
    // WIP fields from the same endpoint
    totalEpics?: number;
    inProgressPercentage?: number;
    inProgressCount?: number;
    inProgressStatus?: 'red' | 'yellow' | 'green';
  }>({});
  const [selectedPI, setSelectedPI] = useState<string>('Q42025');
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [piInput, setPiInput] = useState<string>('Q42025');

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

  // Fetch PI status data (includes both Epic Closure and WIP data)
  useEffect(() => {
    if (!selectedPI) return;
    
    const apiService = new ApiService();
    const fetchPIStatus = async () => {
      setLoading(true);
      try {
        const response = await apiService.getPIStatusForToday(selectedPI);
        console.log('Full Response:', response);
        // Use the first item from the array, or aggregate if needed
        if (response.data && response.data.length > 0) {
          const firstItem = response.data[0];
          console.log('First Item (all fields):', firstItem);
          console.log('All field names:', Object.keys(firstItem));
          console.log('Field values:', {
            'progress_delta_pct_status': firstItem['progress_delta_pct_status'],
            'progress_delta_pct': firstItem['progress_delta_pct'],
            'planned_epics': firstItem['planned_epics'],
            'added_epics': firstItem['added_epics'],
            'removed_epics': firstItem['removed_epics'],
            'in_progress_percentage': firstItem['in_progress_percentage'],
            'count_in_progress_status': firstItem['count_in_progress_status'],
            'total_issues': firstItem['total_issues'],
            'remaining_epics': firstItem['remaining_epics'],
            'ideal_remaining': firstItem['ideal_remaining'],
          });
          // Extract fields from response
          const statusValue = firstItem['progress_delta_pct_status'];
          const progressValue = firstItem['progress_delta_pct'];
          const plannedEpics = firstItem['planned_epics'] || 0;
          const addedEpics = firstItem['added_epics'] || 0;
          const removedEpics = firstItem['removed_epics'] || 0;
          // Calculate total epics: planned + added - removed
          const totalEpics = plannedEpics + addedEpics - removedEpics;
          const inProgressPct = firstItem['in_progress_percentage'];
          // Calculate in-progress count from percentage and total epics
          const inProgressCount = totalEpics > 0 && inProgressPct !== undefined 
            ? Math.round(totalEpics * (inProgressPct / 100))
            : undefined;
          
          console.log('Calculated values:', {
            totalEpics,
            inProgressPct,
            inProgressCount,
            inProgressStatus: firstItem['count_in_progress_status'],
          });
          
          setEpicClosureData({
            value: progressValue,
            color: statusValue,
            totalIssue: firstItem['total_issues'],
            remainingEpics: firstItem['remaining_epics'],
            idealRemaining: firstItem['ideal_remaining'],
            // WIP fields from the same endpoint
            totalEpics: totalEpics,
            inProgressPercentage: inProgressPct,
            inProgressCount: inProgressCount,
            inProgressStatus: firstItem['count_in_progress_status'],
          });
        } else {
          setEpicClosureData({});
        }
      } catch (err) {
        console.error('Failed to fetch PI status data:', err);
        setEpicClosureData({});
      } finally {
        setLoading(false);
      }
    };

    fetchPIStatus();
  }, [selectedPI]);

  const metrics = [
    {
      title: 'Epic Closure',
      tooltip: epicClosureData.totalEpics !== undefined && epicClosureData.remainingEpics !== undefined && epicClosureData.idealRemaining !== undefined
        ? `Closure gap from the ideal. Total Epics: ${epicClosureData.totalEpics}. Remaining epics: ${epicClosureData.remainingEpics}. Ideal remaining: ${epicClosureData.idealRemaining}`
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
      tooltip: epicClosureData.totalEpics !== undefined && epicClosureData.inProgressCount !== undefined && epicClosureData.inProgressPercentage !== undefined
        ? `Total epics: ${epicClosureData.totalEpics}. Currently in progress: ${epicClosureData.inProgressCount} (${epicClosureData.inProgressPercentage.toFixed(1)}%)`
        : 'Number of epics that are in progress in the PI',
      value: epicClosureData.inProgressCount !== undefined && epicClosureData.inProgressCount !== null 
        ? epicClosureData.inProgressCount 
        : undefined,
      color: epicClosureData.inProgressStatus,
      icon: '🚀',
    },
  ];

  const handleApplyFilter = async () => {
    const piName = piInput.trim();
    if (piName) {
      setSelectedPI(piName);
      // Manually trigger fetch for PI status (includes both Epic Closure and WIP data)
      setLoading(true);
      try {
        const apiService = new ApiService();
        
        // Fetch PI status data
        const response = await apiService.getPIStatusForToday(piName);
        console.log('Full Response (handleApplyFilter):', response);
        if (response.data && response.data.length > 0) {
          const firstItem = response.data[0];
          console.log('First Item (all fields - handleApplyFilter):', firstItem);
          console.log('All field names (handleApplyFilter):', Object.keys(firstItem));
          console.log('Field values (handleApplyFilter):', {
            'progress_delta_pct_status': firstItem['progress_delta_pct_status'],
            'progress_delta_pct': firstItem['progress_delta_pct'],
            'planned_epics': firstItem['planned_epics'],
            'added_epics': firstItem['added_epics'],
            'removed_epics': firstItem['removed_epics'],
            'in_progress_percentage': firstItem['in_progress_percentage'],
            'count_in_progress_status': firstItem['count_in_progress_status'],
            'total_issues': firstItem['total_issues'],
            'remaining_epics': firstItem['remaining_epics'],
            'ideal_remaining': firstItem['ideal_remaining'],
          });
          // Extract fields from response
          const statusValue = firstItem['progress_delta_pct_status'];
          const progressValue = firstItem['progress_delta_pct'];
          const plannedEpics = firstItem['planned_epics'] || 0;
          const addedEpics = firstItem['added_epics'] || 0;
          const removedEpics = firstItem['removed_epics'] || 0;
          // Calculate total epics: planned + added - removed
          const totalEpics = plannedEpics + addedEpics - removedEpics;
          const inProgressPct = firstItem['in_progress_percentage'];
          // Calculate in-progress count from percentage and total epics
          const inProgressCount = totalEpics > 0 && inProgressPct !== undefined 
            ? Math.round(totalEpics * (inProgressPct / 100))
            : undefined;
          
          console.log('Calculated values (handleApplyFilter):', {
            totalEpics,
            inProgressPct,
            inProgressCount,
            inProgressStatus: firstItem['count_in_progress_status'],
          });
          
          setEpicClosureData({
            value: progressValue,
            color: statusValue,
            totalIssue: firstItem['total_issues'],
            remainingEpics: firstItem['remaining_epics'],
            idealRemaining: firstItem['ideal_remaining'],
            // WIP fields from the same endpoint
            totalEpics: totalEpics,
            inProgressPercentage: inProgressPct,
            inProgressCount: inProgressCount,
            inProgressStatus: firstItem['count_in_progress_status'],
          });
        } else {
          setEpicClosureData({});
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setEpicClosureData({});
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
          <div className="w-full sm:w-[300px]">
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

          <div className="w-full sm:w-auto">
            <button
              onClick={handleApplyFilter}
              disabled={loading || !piInput.trim()}
              className="w-full sm:w-auto px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
              remainingEpics={index === 0 ? epicClosureData.remainingEpics : undefined}
              idealRemaining={index === 0 ? epicClosureData.idealRemaining : undefined}
              totalEpics={index === 4 ? epicClosureData.totalEpics : undefined}
              inProgressPercentage={index === 4 ? epicClosureData.inProgressPercentage : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

