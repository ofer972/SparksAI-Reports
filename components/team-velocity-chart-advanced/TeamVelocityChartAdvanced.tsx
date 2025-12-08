'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiService } from '@/lib/api';
import { ClosedSprint } from '@/lib/config';
import StackedGroupedBarChart, {
  StackedGroupedBarChartData,
} from '../StackedGroupedBarChart';

const sprintScopeColors = {
  'Issues Planned': '#0066cc',
  'Issues Added': '#800080',
  'Issues Completed': '#009900',
  'Issues Not Completed': '#ff8c00',
  'Issues Removed': '#00ffff',
};

export default function TeamVelocityChartAdvanced() {
  const [sprints, setSprints] = useState<ClosedSprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [months, setMonths] = useState<number>(3);

  const apiService = new ApiService();

  // Fetch available teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsResponse = await apiService.getTeams();
        if (teamsResponse.teams && teamsResponse.teams.length > 0) {
          setAvailableTeams(teamsResponse.teams);
          // Auto-select first team if none selected
          if (!selectedTeam && teamsResponse.teams.length > 0) {
            setSelectedTeam(teamsResponse.teams[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    fetchTeams();
  }, []);

  // Fetch closed sprints data
  const fetchData = useCallback(async () => {
    if (!selectedTeam) {
      setSprints([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getClosedSprints(selectedTeam, months, false);
      
      // Extract sprints for the selected team
      if (result.closed_sprints_by_team && result.closed_sprints_by_team[selectedTeam]) {
        setSprints(result.closed_sprints_by_team[selectedTeam]);
      } else {
        setSprints([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch closed sprints data';
      setError(`${errorMessage}. Check browser console for details.`);
      setSprints([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Closed Sprints API Error:', {
          error: err,
          selectedTeam,
          months
        });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, months]);

  // Fetch data when selectedTeam or months changes
  useEffect(() => {
    if (selectedTeam) {
      fetchData();
    }
  }, [fetchData]);

  // Transform sprint data to chart format
  const chartData = useMemo((): StackedGroupedBarChartData[] => {
    if (!sprints || sprints.length === 0) {
      return [];
    }

    const data: StackedGroupedBarChartData[] = [];

    sprints.forEach((sprint) => {
      const sprintName = sprint.sprint_name;

      // Left Stack: Plan/Add
      // Issues Planned (issues_at_start)
      if (sprint.issues_at_start > 0) {
        data.push({
          quarter: sprintName,
          stackGroup: 'Plan/Add',
          metricName: 'Issues Planned',
          value: sprint.issues_at_start,
          issueKeys: sprint.issues_at_start_keys || [],
        });
      }

      // Issues Added
      if (sprint.issues_added > 0) {
        data.push({
          quarter: sprintName,
          stackGroup: 'Plan/Add',
          metricName: 'Issues Added',
          value: sprint.issues_added,
          issueKeys: sprint.issues_added_keys || [],
        });
      }

      // Right Stack: Res/NotRes/Rem
      // Issues Completed
      if (sprint.issues_done > 0) {
        data.push({
          quarter: sprintName,
          stackGroup: 'Res/NotRes/Rem',
          metricName: 'Issues Completed',
          value: sprint.issues_done,
          issueKeys: sprint.completed_issue_keys || [],
        });
      }

      // Issues Not Completed
      if (sprint.issues_not_completed > 0) {
        data.push({
          quarter: sprintName,
          stackGroup: 'Res/NotRes/Rem',
          metricName: 'Issues Not Completed',
          value: sprint.issues_not_completed,
          issueKeys: sprint.issues_not_completed_keys || [],
        });
      }

      // Issues Removed
      if (sprint.issues_removed > 0) {
        data.push({
          quarter: sprintName,
          stackGroup: 'Res/NotRes/Rem',
          metricName: 'Issues Removed',
          value: sprint.issues_removed,
          issueKeys: sprint.issues_removed_keys || [],
        });
      }
    });

    return data;
  }, [sprints]);

  const showChart = !loading && !error && selectedTeam && chartData.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Team Velocity Chart (Advanced)</h1>
        
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Team:</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            >
              <option value="">Select Team</option>
              {availableTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Months:</label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 Month</option>
              <option value={2}>2 Months</option>
              <option value={3}>3 Months</option>
              <option value={4}>4 Months</option>
              <option value={6}>6 Months</option>
              <option value={9}>9 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-gray-600">Loading closed sprints...</div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && !selectedTeam && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Please select a team to view closed sprints.
          </div>
        )}

        {showChart && (
          <div className="w-full h-full flex-1 relative min-h-[350px]">
            <StackedGroupedBarChart
              data={chartData}
              title={`Velocity Chart - Advanced (${selectedTeam})`}
              yAxisLabel="# of Issues"
              xAxisLabel="Sprint"
              colorScheme={sprintScopeColors}
              loading={false}
              error={null}
            />
          </div>
        )}

        {!loading && !error && selectedTeam && chartData.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No closed sprints found for the selected team and time period.
          </div>
        )}
      </div>
    </div>
  );
}
