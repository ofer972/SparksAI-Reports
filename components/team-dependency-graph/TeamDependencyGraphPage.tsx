'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ApiService } from '@/lib/api';
import { EpicDependencyItem } from '@/lib/config';

// Interface for team dependency
interface TeamDependency {
  fromTeam: string;
  toTeam: string;
  storyCount: number;
}

// Transform API data to team dependencies
// Based on actual API structure:
// Outbound: owned_team is the "from" team, relying_on_teams_array are teams it depends on
// Inbound: assignee_team is the "to" team, relying_teams_array are teams that depend on it
const transformApiDataToTeamDependencies = (
  outboundData: EpicDependencyItem[],
  inboundData: EpicDependencyItem[]
): TeamDependency[] => {
  const dependencies: TeamDependency[] = [];
  const dependencyMap = new Map<string, number>();

  // Process outbound data
  // owned_team is the team that has dependencies (fromTeam)
  // relying_on_teams_array contains the teams they depend on (toTeam)
  // number_of_dependent_issues is the count
  outboundData.forEach((item: any) => {
    const fromTeam = item.owned_team;
    if (!fromTeam) return;

    // Get the teams this team relies on (filters out null values)
    const relyingOnTeams = (item.relying_on_teams_array || []).filter((team: string | null) => team && team !== null);
    
    if (relyingOnTeams.length === 0) return;
    
    // Get the number of dependent issues (count)
    const dependentIssues = item.number_of_dependent_issues || 0;
    
    // Distribute the count across teams, rounded to integer
    const countPerTeam = relyingOnTeams.length > 0 && dependentIssues > 0 
      ? Math.round(dependentIssues / relyingOnTeams.length)
      : 1;
    
    relyingOnTeams.forEach((toTeam: string) => {
      if (toTeam && toTeam !== fromTeam) {
        const depKey = `${fromTeam}->${toTeam}`;
        dependencyMap.set(depKey, (dependencyMap.get(depKey) || 0) + countPerTeam);
      }
    });
  });

  // Process inbound data
  // assignee_team is the team being depended upon (toTeam)
  // relying_teams_array contains the teams that depend on it (fromTeam)
  // volume_of_work_relied_upon is the count
  inboundData.forEach((item: any) => {
    const toTeam = item.assignee_team;
    if (!toTeam) return;

    // Get the teams that rely on this team (filters out null values)
    const relyingTeams = (item.relying_teams_array || []).filter((team: string | null) => team && team !== null);
    
    if (relyingTeams.length === 0) return;
    
    // Get the volume of work (count)
    const volume = item.volume_of_work_relied_upon || 0;
    
    // Distribute the volume across teams, rounded to integer
    const countPerTeam = relyingTeams.length > 0 && volume > 0
      ? Math.round(volume / relyingTeams.length)
      : 1;
    
    // For each relying team, create a dependency
    relyingTeams.forEach((fromTeam: string) => {
      if (fromTeam && fromTeam !== toTeam) {
        const depKey = `${fromTeam}->${toTeam}`;
        dependencyMap.set(depKey, (dependencyMap.get(depKey) || 0) + countPerTeam);
      }
    });
  });

  // Convert map to array and ensure counts are integers
  dependencyMap.forEach((count, key) => {
    const parts = key.split('->');
    if (parts.length === 2) {
      const fromTeam = parts[0];
      const toTeam = parts[1];
      if (fromTeam && toTeam) {
        dependencies.push({
          fromTeam: fromTeam,
          toTeam: toTeam,
          storyCount: Math.round(count), // Round to integer
        });
      }
    }
  });

  return dependencies;
};

// Calculate node positions in a circular layout
const calculateNodePositions = (teams: string[], radius = 300) => {
  const centerX = 400;
  const centerY = 400;
  const angleStep = (2 * Math.PI) / teams.length;

  return teams.map((team, index) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { team, x, y };
  });
};

export default function TeamDependencyGraphPage() {
  const [outboundData, setOutboundData] = useState<EpicDependencyItem[]>([]);
  const [inboundData, setInboundData] = useState<EpicDependencyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [piInput, setPiInput] = useState<string>('');

  const apiService = new ApiService();

  // Fetch available PIs
  useEffect(() => {
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

  // Fetch data for both endpoints
  const fetchData = async (pi?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch dependency data - both already contain team names directly
      const [outboundResult, inboundResult] = await Promise.all([
        apiService.getEpicOutboundDependencyLoadByQuarter(pi),
        apiService.getEpicInboundDependencyLoadByQuarter(pi),
      ]);
      
      setOutboundData(outboundResult);
      setInboundData(inboundResult);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team dependency data';
      setError(`${errorMessage}. Check browser console for details.`);
      setOutboundData([]);
      setInboundData([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Team Dependency Graph API Error:', {
          error: err,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when selectedPI changes (only after Apply is clicked)
  useEffect(() => {
    if (selectedPI) {
      fetchData(selectedPI);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPI]);

  const handleApplyFilter = () => {
    const piName = piInput.trim();
    if (piName) {
      setSelectedPI(piName);
    }
  };

  // Transform API data to team dependencies
  const teamDependencies = useMemo(() => {
    if (outboundData.length === 0 && inboundData.length === 0) {
      return [];
    }
    
    const result = transformApiDataToTeamDependencies(outboundData, inboundData);
    
    return result;
  }, [outboundData, inboundData]);

  // Get unique teams
  const uniqueTeams = useMemo(() => {
    return Array.from(
      new Set([
        ...teamDependencies.map((d) => d.fromTeam),
        ...teamDependencies.map((d) => d.toTeam),
      ])
    ).filter(Boolean);
  }, [teamDependencies]);

  // Calculate node positions in a circular layout
  const nodePositions = useMemo(() => {
    return calculateNodePositions(uniqueTeams);
  }, [uniqueTeams]);

  // Initialize nodes with state
  const initialNodes: Node[] = useMemo(
    () =>
      nodePositions.map((pos, index) => ({
        id: pos.team,
        type: 'default',
        position: { x: pos.x, y: pos.y },
        draggable: true,
        selectable: true,
        data: {
          label: pos.team,
        },
        style: {
          background: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '10px 15px',
          minWidth: '120px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          cursor: 'grab',
          pointerEvents: 'auto',
        },
      })),
    [nodePositions]
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  // Update nodes when teams change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  // Handle node changes (for dragging)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  // Create edges from team dependencies
  const edges: Edge[] = useMemo(() => {
    if (teamDependencies.length === 0) {
      return [];
    }

    const edgeMap = new Map<string, { forward: number; reverse?: number }>();
    const processedPairs = new Set<string>();

    // First pass: collect all dependencies and detect bidirectional
    teamDependencies.forEach((dep) => {
      // Use separator that won't conflict with team names (which may contain dashes)
      const pairKey = [dep.fromTeam, dep.toTeam].sort().join('|||');
      
      if (processedPairs.has(pairKey)) {
        return; // Already processed this pair
      }

      const key = `${dep.fromTeam}->${dep.toTeam}`;
      
      // Check if reverse dependency exists
      const reverse = teamDependencies.find(
        (d) => d.fromTeam === dep.toTeam && d.toTeam === dep.fromTeam
      );

      if (reverse) {
        // Bidirectional dependency detected
        edgeMap.set(key, {
          forward: dep.storyCount,
          reverse: reverse.storyCount,
        });
        processedPairs.add(pairKey);
      } else {
        // One-way dependency
        edgeMap.set(key, { forward: dep.storyCount });
        processedPairs.add(pairKey);
      }
    });

    // Second pass: create edges
    const createdEdges: Edge[] = [];

    edgeMap.forEach((counts, key) => {
      const parts = key.split('->');
      if (parts.length !== 2) return;
      const fromTeam = parts[0];
      const toTeam = parts[1];

      if (counts.reverse !== undefined && counts.reverse > 0) {
        // Bidirectional: create two edges with offset for visibility
        // Forward edge (blue, going right/down)
        createdEdges.push({
          id: `edge-${fromTeam}-${toTeam}`,
          source: fromTeam,
          target: toTeam,
          label: `${counts.forward} stories`,
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: Math.min(3 + counts.forward * 0.5, 8),
            stroke: '#3b82f6',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
            width: 20,
            height: 20,
          },
          labelStyle: {
            fill: '#1e40af',
            fontWeight: 600,
            fontSize: '12px',
            background: '#ffffff',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #3b82f6',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.95,
          },
        });

        // Reverse edge (red, going left/up)
        createdEdges.push({
          id: `edge-${toTeam}-${fromTeam}`,
          source: toTeam,
          target: fromTeam,
          label: `${counts.reverse} stories`,
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: Math.min(3 + counts.reverse * 0.5, 8),
            stroke: '#ef4444',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#ef4444',
            width: 20,
            height: 20,
          },
          labelStyle: {
            fill: '#991b1b',
            fontWeight: 600,
            fontSize: '12px',
            background: '#ffffff',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #ef4444',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.95,
          },
        });
      } else {
        // One-way dependency
        createdEdges.push({
          id: `edge-${fromTeam}-${toTeam}`,
          source: fromTeam,
          target: toTeam,
          label: `${counts.forward} stories`,
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: Math.min(3 + counts.forward * 0.5, 8),
            stroke: '#3b82f6',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
            width: 20,
            height: 20,
          },
          labelStyle: {
            fill: '#1e40af',
            fontWeight: 600,
            fontSize: '12px',
            background: '#ffffff',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #3b82f6',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.95,
          },
        });
      }
    });

    return createdEdges;
  }, [teamDependencies]);

  // Debug information for display (moved after all dependencies are defined)
  const debugInfo = useMemo(() => {
    const info: string[] = [];
    
    info.push(`=== Data Summary ===`);
    info.push(`Outbound records: ${outboundData.length}`);
    info.push(`Inbound records: ${inboundData.length}`);
    info.push(`Transformed dependencies: ${teamDependencies.length}`);
    info.push('');
    
    // Show all teams in outbound data
    if (outboundData.length > 0) {
      const outboundTeams = [...new Set(outboundData.map((item: any) => item.owned_team).filter(Boolean))];
      info.push(`Outbound teams (${outboundTeams.length}): ${outboundTeams.join(', ')}`);
      
      // Check for CAN-IDPS-Test specifically
      const testTeamOutbound = outboundData.find((item: any) => 
        item.owned_team && item.owned_team.includes('CAN-IDPS-Test')
      );
      if (testTeamOutbound) {
        info.push(`✓ CAN-IDPS-Test found in outbound`);
        info.push(`  owned_team: ${testTeamOutbound.owned_team}`);
        info.push(`  relying_on_teams_array: ${JSON.stringify(testTeamOutbound.relying_on_teams_array)}`);
        info.push(`  number_of_dependent_issues: ${testTeamOutbound.number_of_dependent_issues}`);
      } else {
        info.push(`✗ CAN-IDPS-Test NOT found in outbound`);
      }
      info.push('');
    }
    
    // Show all teams in inbound data
    if (inboundData.length > 0) {
      const inboundTeams = [...new Set(inboundData.map((item: any) => item.assignee_team).filter(Boolean))];
      info.push(`Inbound teams (${inboundTeams.length}): ${inboundTeams.join(', ')}`);
      
      // Check for CAN-IDPS-Test specifically
      const testTeamInbound = inboundData.find((item: any) => 
        item.assignee_team && item.assignee_team.includes('CAN-IDPS-Test')
      );
      if (testTeamInbound) {
        info.push(`✓ CAN-IDPS-Test found in inbound`);
        info.push(`  assignee_team: ${testTeamInbound.assignee_team}`);
        info.push(`  relying_teams_array: ${JSON.stringify(testTeamInbound.relying_teams_array)}`);
        info.push(`  volume_of_work_relied_upon: ${testTeamInbound.volume_of_work_relied_upon}`);
      } else {
        info.push(`✗ CAN-IDPS-Test NOT found in inbound`);
      }
      info.push('');
    }
    
    // Show all dependencies
    const allTeams = [...new Set([...teamDependencies.map(d => d.fromTeam), ...teamDependencies.map(d => d.toTeam)])];
    info.push(`=== Transformed Dependencies ===`);
    info.push(`All teams in graph (${allTeams.length}): ${allTeams.join(', ')}`);
    info.push('');
    
    const testDeps = teamDependencies.filter(dep => 
      dep.fromTeam.includes('CAN-IDPS-Test') || dep.toTeam.includes('CAN-IDPS-Test')
    );
    if (testDeps.length > 0) {
      info.push(`✓ CAN-IDPS-Test dependencies (${testDeps.length}):`);
      testDeps.forEach(dep => {
        info.push(`  ${dep.fromTeam} -> ${dep.toTeam}: ${dep.storyCount} stories`);
      });
    } else {
      info.push(`✗ WARNING: CAN-IDPS-Test has NO dependencies in graph!`);
    }
    info.push('');
    info.push(`=== Graph Info ===`);
    info.push(`Total nodes: ${uniqueTeams.length}`);
    info.push(`Total edges: ${edges.length}`);
    info.push(`Node IDs: ${nodes.map(n => n.id).join(', ')}`);
    info.push(`Edge sources/targets: ${edges.map(e => `${e.source}->${e.target}`).join(', ')}`);
    
    return info;
  }, [outboundData, inboundData, teamDependencies, uniqueTeams, nodes, edges]);

  const onInit = useCallback((reactFlowInstance: any) => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-lg font-medium text-gray-700">Loading team dependency data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-red-600 font-medium mb-2">Error</div>
        <div className="text-sm text-gray-600">{error}</div>
        <button
          onClick={() => fetchData(selectedPI)}
          className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Don't show graph if no PI is selected
  if (!selectedPI) {
    return (
      <div className="h-full w-full bg-gray-50">
        <div className="space-y-6">
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
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-lg font-medium text-gray-700 mb-2">Please select a PI and click Apply to view the dependency graph</div>
          </div>
        </div>
      </div>
    );
  }

  if (uniqueTeams.length === 0 && !loading) {
    return (
      <div className="h-full w-full bg-gray-50">
        <div className="space-y-6">
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
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-lg font-medium text-gray-700 mb-2">No team dependencies found</div>
            <div className="text-sm text-gray-600">Try selecting a different PI or check the data source.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50">
      <style jsx global>{`
        .react-flow__node {
          cursor: grab !important;
        }
        .react-flow__node:active {
          cursor: grabbing !important;
        }
        .react-flow__node-default {
          pointer-events: auto !important;
        }
        .react-flow__node-default .react-flow__handle {
          pointer-events: none;
        }
      `}</style>
      <div className="space-y-6">
        {/* Debug Info Panel */}
        {selectedPI && (outboundData.length > 0 || inboundData.length > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">Debug Information</h3>
            <div className="bg-white border border-yellow-300 rounded p-3 max-h-60 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {debugInfo.join('\n')}
              </pre>
            </div>
          </div>
        )}

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

        {/* Graph Section - Only show if PI is selected and data is loaded */}
        {selectedPI && uniqueTeams.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Team Dependency Graph
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Visualize dependencies between teams. Arrows show dependency direction,
                numbers indicate story counts, and line thickness represents dependency
                magnitude. Click and drag nodes to reposition them.
              </p>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-blue-500"></div>
                  <span>One-way dependency</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-red-500"></div>
                  <span>Reverse dependency</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Thicker line = More dependencies</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onInit={onInit}
                connectionMode={ConnectionMode.Loose}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                selectNodesOnDrag={false}
                panOnScroll={true}
                zoomOnScroll={true}
                fitView
                attributionPosition="bottom-left"
              >
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    return '#3b82f6';
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
                <Background color="#f3f4f6" gap={16} />
              </ReactFlow>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

