'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { InsightType } from '@/lib/config';
import Toast from '@/components/Toast';
import ErrorModal from '@/components/ErrorModal';

export default function CreateAgentJobsPage() {
  const apiService = new ApiService();

  // State
  const [insightTypes, setInsightTypes] = useState<InsightType[]>([]);
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [selectedPI, setSelectedPI] = useState<Record<string | number, string>>({});
  const [selectedTeam, setSelectedTeam] = useState<Record<string | number, string>>({});
  const [globalTeamFilter, setGlobalTeamFilter] = useState<string>('');
  const [globalPIFilter, setGlobalPIFilter] = useState<string>('');
  const [loading, setLoading] = useState<Record<string | number, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch available PIs for dropdown
  const fetchPIs = async () => {
    try {
      const pisResponse = await apiService.getPIs();
      if (pisResponse.pis && pisResponse.pis.length > 0) {
        const piNames = pisResponse.pis.map(pi => pi.pi_name);
        setAvailablePIs(piNames);
      }
    } catch (err) {
      console.error('Failed to fetch PIs:', err);
    }
  };

  // Fetch available Teams for dropdown
  const fetchTeams = async () => {
    try {
      const teamsResponse = await apiService.getTeams();
      if (teamsResponse.teams && teamsResponse.teams.length > 0) {
        setAvailableTeams(teamsResponse.teams);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  // Fetch active insight types
  const fetchInsightTypes = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const response = await apiService.getActiveInsightTypes();
      // Normalize field names - API returns snake_case, we need camelCase
      // API fields: insight_type, requires_pi, requires_team
      const normalizedTypes = response.insight_types.map((type: any) => {
        // Map API field names to component field names
        const normalized = {
          id: type.id,
          name: type.name || type.insight_type || 'Unknown',
          requirePI: Boolean(type.requirePI ?? type.requires_pi ?? type.require_pi ?? false),
          requireTeam: Boolean(type.requireTeam ?? type.requires_team ?? type.require_team ?? false),
          active: Boolean(type.active ?? type.is_active ?? false),
          ...type // Keep original fields for reference
        };
        return normalized;
      });
      setInsightTypes(normalizedTypes);
    } catch (err) {
      console.error('Error fetching insight types:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch insight types');
    } finally {
      setFetching(false);
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchInsightTypes();
    fetchPIs();
    fetchTeams();
  }, []);

  // Apply global team filter when insight types or filter changes
  useEffect(() => {
    if (globalTeamFilter && insightTypes.length > 0) {
      const teamInsightIds = insightTypes
        .filter(type => type.requireTeam === true)
        .map(type => type.id);
      
      setSelectedTeam(prev => {
        const updated = { ...prev };
        teamInsightIds.forEach(id => {
          updated[id] = globalTeamFilter;
        });
        return updated;
      });
    }
  }, [globalTeamFilter, insightTypes]);

  // Apply global PI filter when insight types or filter changes
  useEffect(() => {
    if (globalPIFilter && insightTypes.length > 0) {
      const piInsightIds = insightTypes
        .filter(type => type.requireTeam !== true)
        .map(type => type.id);
      
      setSelectedPI(prev => {
        const updated = { ...prev };
        piInsightIds.forEach(id => {
          updated[id] = globalPIFilter;
        });
        return updated;
      });
    }
  }, [globalPIFilter, insightTypes]);

  // Handle global team filter - applies to all team insights
  const handleGlobalTeamFilter = (team: string) => {
    setGlobalTeamFilter(team);
  };

  // Handle global PI filter - applies to all PI insights
  const handleGlobalPIFilter = (pi: string) => {
    setGlobalPIFilter(pi);
  };

  // Create job handler
  const handleCreateJob = async (insightType: InsightType) => {
    // Validation
    if (insightType.requirePI && !selectedPI[insightType.id]) {
      setErrorModal('PI is required for this insight type');
      return;
    }
    if (insightType.requireTeam && !selectedTeam[insightType.id]) {
      setErrorModal('Team is required for this insight type');
      return;
    }

    setLoading(prev => ({ ...prev, [insightType.id]: true }));
    try {
      let response;
      // Use insight type name (job_type) instead of ID
      const jobType = insightType.name || insightType.insight_type || 'Unknown';
      
      if (insightType.requirePI && insightType.requireTeam) {
        response = await apiService.createPIJobForTeam(
          jobType,
          selectedPI[insightType.id],
          selectedTeam[insightType.id]
        );
      } else if (insightType.requireTeam) {
        response = await apiService.createTeamJob(
          jobType,
          selectedTeam[insightType.id]
        );
      } else if (insightType.requirePI) {
        response = await apiService.createPIJob(
          jobType,
          selectedPI[insightType.id]
        );
      }

      if (response?.success) {
        // Build toast message with agent name, PI, and team if they exist
        const agentName = insightType.name || 'Agent';
        const parts: string[] = [`${agentName} job created`];
        
        if (selectedPI[insightType.id]) {
          parts.push(`PI: ${selectedPI[insightType.id]}`);
        }
        
        if (selectedTeam[insightType.id]) {
          parts.push(`Team: ${selectedTeam[insightType.id]}`);
        }
        
        setToast(parts.join(', '));
      } else {
        setErrorModal(response?.message || 'Failed to create job');
      }
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(prev => ({ ...prev, [insightType.id]: false }));
    }
  };

  // Render card for each insight type
  const renderInsightTypeCard = (insightType: InsightType) => {
    const canCreate = 
      (!insightType.requirePI || selectedPI[insightType.id]) &&
      (!insightType.requireTeam || selectedTeam[insightType.id]);
    const isLoading = loading[insightType.id] || false;

    return (
      <div key={insightType.id} className="bg-white rounded-lg shadow-lg border-2 border-gray-300 p-2 flex flex-col w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-1.5">
          {insightType.name || `Insight Type ${insightType.id}`}
        </h3>
        
        <div className="space-y-2">
          {insightType.requirePI && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-12">
                PI:
              </label>
              <select
                value={selectedPI[insightType.id] || ''}
                onChange={(e) => setSelectedPI(prev => ({
                  ...prev,
                  [insightType.id]: e.target.value
                }))}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Select PI</option>
                {availablePIs.length > 0 ? (
                  availablePIs.map(pi => (
                    <option key={pi} value={pi}>{pi}</option>
                  ))
                ) : (
                  <option value="" disabled>Loading PIs...</option>
                )}
              </select>
            </div>
          )}
          
          {insightType.requireTeam && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-12">
                Team:
              </label>
              <select
                value={selectedTeam[insightType.id] || ''}
                onChange={(e) => setSelectedTeam(prev => ({
                  ...prev,
                  [insightType.id]: e.target.value
                }))}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Select Team</option>
                {availableTeams.length > 0 ? (
                  availableTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))
                ) : (
                  <option value="" disabled>Loading Teams...</option>
                )}
              </select>
            </div>
          )}
        </div>

        {(!insightType.requirePI && !insightType.requireTeam) && (
          <p className="text-xs text-gray-500 mb-1.5">No filters required for this insight type.</p>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => handleCreateJob(insightType)}
            disabled={!canCreate || isLoading}
            className="w-auto px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </div>
    );
  };

  // Separate insight types into Team Insights and PI Insights
  // Team Insights: requireTeam === true
  // PI Insights: requireTeam !== true
  // Sort team insights: those that don't require PI first, then those that require PI
  const teamInsights = insightTypes
    .filter(type => type.requireTeam === true)
    .sort((a, b) => {
      // If a requires PI and b doesn't, b comes first
      if (a.requirePI && !b.requirePI) return 1;
      // If b requires PI and a doesn't, a comes first
      if (!a.requirePI && b.requirePI) return -1;
      // Otherwise maintain original order
      return 0;
    });
  const piInsights = insightTypes.filter(type => type.requireTeam !== true);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Create Agent Jobs</h1>
      
      {fetching && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading insight types...</p>
        </div>
      )}

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-800">{fetchError}</div>
        </div>
      )}

      {!fetching && !fetchError && insightTypes.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-600">No active insight types found.</p>
        </div>
      )}

      {!fetching && !fetchError && insightTypes.length > 0 && (
        <div className="flex flex-col md:flex-row gap-[4.5rem] items-start">
          {/* Team Insights Container - Left Side */}
          <div className="flex-1 max-w-[40%]">
            <div className="bg-white rounded-lg border border-gray-500 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Insights</h2>
              
              {/* Global Team Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Team:
                </label>
                <select
                  value={globalTeamFilter}
                  onChange={(e) => handleGlobalTeamFilter(e.target.value)}
                  className="w-[60%] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={teamInsights.length === 0}
                >
                  <option value="">Select Team (applies to all)</option>
                  {availableTeams.length > 0 ? (
                    availableTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))
                  ) : (
                    <option value="" disabled>Loading Teams...</option>
                  )}
                </select>
              </div>

              {teamInsights.length > 0 ? (
                <div className="space-y-4">
                  {teamInsights.map(renderInsightTypeCard)}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                  <p className="text-gray-500">No Team Insights available</p>
                </div>
              )}
            </div>
          </div>

          {/* PI Insights Container - Right Side */}
          <div className="flex-1 max-w-[40%]">
            <div className="bg-white rounded-lg border border-gray-500 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">PI Insights</h2>
              
              {/* Global PI Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select PI:
                </label>
                <select
                  value={globalPIFilter}
                  onChange={(e) => handleGlobalPIFilter(e.target.value)}
                  className="w-[60%] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={piInsights.length === 0}
                >
                  <option value="">Select PI (applies to all)</option>
                  {availablePIs.length > 0 ? (
                    availablePIs.map(pi => (
                      <option key={pi} value={pi}>{pi}</option>
                    ))
                  ) : (
                    <option value="" disabled>Loading PIs...</option>
                  )}
                </select>
              </div>

              {piInsights.length > 0 ? (
                <div className="space-y-4">
                  {piInsights.map(renderInsightTypeCard)}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                  <p className="text-gray-500">No PI Insights available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Error Modal/Popup */}
      {errorModal && (
        <ErrorModal
          message={errorModal}
          onClose={() => setErrorModal(null)}
        />
      )}
    </div>
  );
}

