'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getGroupsHierarchy,
  getAllTeams,
  getTeamsByGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  createTeam,
  updateTeam,
  deleteTeam,
  connectTeamToGroup,
  disconnectTeamFromGroup,
  getChildGroups,
  isLeafGroup,
  findGroupByName,
  findGroupById,
  type Group,
  type Team,
  type TeamsByGroupResponse,
} from '@/lib/teams-service';

interface TreeNode {
  group: Group;
  level: number;
  children: TreeNode[];
}

export default function TeamsManagementPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // Teams for selected group
  const [allTeams, setAllTeams] = useState<Team[]>([]); // All teams (for connecting)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'group-teams' | 'all-teams'>('group-teams');
  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingTeamName, setEditingTeamName] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  
  // Modal states
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddSubgroupModal, setShowAddSubgroupModal] = useState<number | null>(null);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showConnectTeamModal, setShowConnectTeamModal] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');

  // Fetch all groups hierarchy
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const groupsData = await getGroupsHierarchy();
      setGroups(groupsData);
      // Expand all by default, including virtual root (id: -1)
      setExpandedGroups(new Set([-1, ...groupsData.map(g => g.id)]));
      // Select first leaf group if available
      if (groupsData.length > 0 && !selectedGroupId) {
        const firstLeaf = groupsData.find(g => isLeafGroup(g.id, groupsData));
        if (firstLeaf) {
          setSelectedGroupId(firstLeaf.id);
        } else {
          setSelectedGroupId(groupsData[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all teams (for connecting to groups)
  const fetchAllTeams = async () => {
    try {
      const allTeamsData = await getAllTeams();
      console.log('fetchAllTeams: Received teams data:', allTeamsData);
      setAllTeams(allTeamsData);
    } catch (err) {
      console.error('Failed to fetch all teams:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all teams';
      setError(errorMessage);
      // Set empty array on error so UI doesn't break
      setAllTeams([]);
    }
  };

  // Fetch teams for a specific group
  const fetchTeamsForGroup = async (groupName: string) => {
    try {
      const response: TeamsByGroupResponse = await getTeamsByGroup(groupName);
      setTeams(response.data.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
      setTeams([]);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchAllTeams(); // Fetch all teams on load
  }, []);

  // Fetch teams when group is selected
  useEffect(() => {
    if (selectedGroupId) {
      const selectedGroup = findGroupById(selectedGroupId, groups);
      if (selectedGroup) {
        fetchTeamsForGroup(selectedGroup.name);
      }
    }
  }, [selectedGroupId, groups]);

  // Build tree structure from flat groups
  const buildTree = (allGroups: Group[]): TreeNode[] => {
    // Safety check: ensure allGroups is always an array
    if (!Array.isArray(allGroups)) {
      return [];
    }

    const buildNode = (group: Group, level: number): TreeNode => {
      const children = getChildGroups(group.id, allGroups)
        .map(child => buildNode(child, level + 1));
      
      return {
        group,
        level,
        children,
      };
    };

    // Create virtual "All Groups" root node
    const virtualRootGroup: Group = {
      id: -1, // Special ID that won't conflict with real groups
      name: 'All Groups',
      parent_id: null,
    };

    // Find root groups (parent_id is null) - these become children of virtual root
    const rootGroups = allGroups.filter(g => g.parent_id === null);
    const rootChildren = rootGroups.map(g => buildNode(g, 1)); // Level 1 (virtual root is level 0)

    // Return virtual root with all root groups as children
    return [{
      group: virtualRootGroup,
      level: 0,
      children: rootChildren,
    }];
  };

  const tree = useMemo(() => buildTree(groups), [groups]);

  // Get all teams not in any group (unassigned)
  const unassignedTeams = useMemo(() => {
    // Teams that don't have any group_names or have empty group_names
    return allTeams.filter(t => !t.group_names || t.group_names.length === 0);
  }, [allTeams]);

  // Toggle group expansion
  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Group operations
  const handleAddRootGroup = async () => {
    if (!newGroupName.trim()) return;
    setError(null); // Clear previous errors
    try {
      console.log('Adding root group:', newGroupName);
      await createGroup(newGroupName);
      await fetchGroups();
      setNewGroupName('');
      setShowAddGroupModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
      console.error('Error creating group:', err);
      setError(errorMessage);
      // Keep modal open so user can see the error and try again
    }
  };

  const handleAddSubgroup = async (parentId: number) => {
    if (!newGroupName.trim()) return;
    try {
      const parentGroup = findGroupById(parentId, groups);
      if (!parentGroup) {
        throw new Error('Parent group not found');
      }
      await createGroup(newGroupName, parentGroup.name);
      await fetchGroups();
      setNewGroupName('');
      setShowAddSubgroupModal(null);
      setExpandedGroups(prev => new Set([...Array.from(prev), parentId]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subgroup');
    }
  };

  const handleStartEditGroup = (group: Group) => {
    setEditingGroup(group.id);
    setEditingGroupName(group.name);
  };

  const handleSaveGroup = async (groupId: number) => {
    if (!editingGroupName.trim()) return;
    try {
      const group = findGroupById(groupId, groups);
      if (!group) {
        throw new Error('Group not found');
      }
      await updateGroup(group.name, { name: editingGroupName.trim() });
      await fetchGroups();
      setEditingGroup(null);
      setEditingGroupName('');
      // Refresh teams if this group is selected
      if (selectedGroupId === groupId) {
        await fetchTeamsForGroup(editingGroupName.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    const group = findGroupById(groupId, groups);
    if (!group) {
      return;
    }
    if (!confirm(`Delete "${group.name}"? This will also delete all subgroups and disconnect teams.`)) {
      return;
    }
    try {
      await deleteGroup(group.name);
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setTeams([]);
      }
      await fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  // Team operations
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    setError(null); // Clear previous errors
    try {
      console.log('Adding team:', newTeamName);
      await createTeam(newTeamName);
      await fetchAllTeams(); // Refresh all teams list
      setNewTeamName('');
      setShowAddTeamModal(false);
      
      // If a leaf group is selected, automatically connect the team
      if (selectedGroupId) {
        const selectedGroup = findGroupById(selectedGroupId, groups);
        if (selectedGroup && isLeafGroup(selectedGroupId, groups)) {
          await connectTeamToGroup(newTeamName.trim(), selectedGroup.name);
          await fetchTeamsForGroup(selectedGroup.name);
          await fetchAllTeams(); // Refresh again after connecting
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team';
      console.error('Error creating team:', err);
      setError(errorMessage);
      // Keep modal open so user can see the error and try again
    }
  };

  const handleStartEditTeam = (team: Team) => {
    setEditingTeam(team.team_name);
    setEditingTeamName(team.team_name);
  };

  const handleSaveTeam = async (teamName: string) => {
    if (!editingTeamName.trim()) return;
    try {
      await updateTeam(teamName, { teamName: editingTeamName.trim() });
      // Refresh teams for selected group
      if (selectedGroupId) {
        const selectedGroup = findGroupById(selectedGroupId, groups);
        if (selectedGroup) {
          await fetchTeamsForGroup(selectedGroup.name);
        }
      }
      setEditingTeam(null);
      setEditingTeamName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team');
    }
  };

  const handleDeleteTeam = async (teamName: string) => {
    if (!confirm(`Delete team "${teamName}"?`)) return;
    try {
      await deleteTeam(teamName);
      await fetchAllTeams(); // Refresh all teams
      // Refresh teams for selected group
      if (selectedGroupId) {
        const selectedGroup = findGroupById(selectedGroupId, groups);
        if (selectedGroup) {
          await fetchTeamsForGroup(selectedGroup.name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
    }
  };

  // Connection operations
  const handleConnectTeam = async (groupId: number, teamName: string) => {
    try {
      const group = findGroupById(groupId, groups);
      if (group) {
        await connectTeamToGroup(teamName, group.name);
        await fetchTeamsForGroup(group.name);
        await fetchAllTeams(); // Refresh all teams to update group_names
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect team');
    }
  };

  const handleDisconnectTeam = async (groupId: number, teamName: string) => {
    try {
      const group = findGroupById(groupId, groups);
      if (group) {
        await disconnectTeamFromGroup(teamName, group.name);
        await fetchTeamsForGroup(group.name);
        await fetchAllTeams(); // Refresh all teams to update group_names
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect team');
    }
  };

  // Get available teams (teams not in selected group)
  const availableTeams = useMemo(() => {
    if (!selectedGroupId) return [];
    const selectedGroup = findGroupById(selectedGroupId, groups);
    if (!selectedGroup) return [];
    
    // Filter all teams to find those not in the selected group
    return allTeams.filter(team => {
      // Team is available if it doesn't have this group in its group_names
      return !team.group_names || !team.group_names.includes(selectedGroup.name);
    });
  }, [selectedGroupId, allTeams, groups]);

  // Filter available teams for connect modal search
  const [connectModalSearchQuery, setConnectModalSearchQuery] = useState('');
  const [selectedTeamsForConnect, setSelectedTeamsForConnect] = useState<Set<string>>(new Set());
  
  const filteredAvailableTeams = useMemo(() => {
    if (!connectModalSearchQuery.trim()) return availableTeams;
    const query = connectModalSearchQuery.toLowerCase();
    return availableTeams.filter(team =>
      team.team_name.toLowerCase().includes(query) ||
      (team.group_names && team.group_names.some(gn => gn.toLowerCase().includes(query)))
    );
  }, [availableTeams, connectModalSearchQuery]);

  // Handle multi-select team connection
  const handleConnectMultipleTeams = async (groupId: number, teamNames: string[]) => {
    console.log('🔵 handleConnectMultipleTeams called:', { groupId, teamNames, teamCount: teamNames.length });
    if (teamNames.length === 0) {
      console.log('⚠️ No teams selected, returning early');
      return;
    }
    
    try {
      const group = findGroupById(groupId, groups);
      console.log('🔵 Found group:', group);
      if (!group) {
        console.log('❌ Group not found for id:', groupId);
        return;
      }

      // Connect all selected teams
      console.log('🔵 Starting to connect teams...');
      for (const teamName of teamNames) {
        console.log('🔵 Connecting team:', teamName, 'to group:', group.name);
        await connectTeamToGroup(teamName, group.name);
        console.log('✅ Successfully connected team:', teamName);
      }

      // Refresh data
      await fetchTeamsForGroup(group.name);
      await fetchAllTeams();
      
      // Clear selection and close modal
      setSelectedTeamsForConnect(new Set());
      setShowConnectTeamModal(null);
      setConnectModalSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect teams');
    }
  };

  // Toggle team selection in connect modal
  const toggleTeamSelection = (teamName: string) => {
    setSelectedTeamsForConnect(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamName)) {
        newSet.delete(teamName);
      } else {
        newSet.add(teamName);
      }
      return newSet;
    });
  };

  // Recursive component to render group tree nodes
  const GroupTreeNode = ({ node }: { node: TreeNode }) => {
    const isExpanded = expandedGroups.has(node.group.id);
    const hasChildren = node.children.length > 0;
    const isLeaf = isLeafGroup(node.group.id, groups);
    const isSelected = selectedGroupId === node.group.id;
    const isVirtualRoot = node.group.id === -1; // Virtual "All Groups" node

    return (
      <div className="select-none">
        {/* Group Node */}
        <div 
          className={`flex items-center gap-1 py-1 px-1.5 rounded text-sm transition-colors ${
            isVirtualRoot
              ? 'bg-gray-100 cursor-default'
              : isSelected 
                ? 'bg-blue-100 border border-blue-300' 
                : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${node.level * 16 + 4}px` }}
          onClick={() => {
            if (!isVirtualRoot) {
              setSelectedGroupId(node.group.id);
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroup(node.group.id);
              }}
              className="p-0.5 text-gray-600 hover:text-gray-900 flex-shrink-0 w-4 h-4 flex items-center justify-center"
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Group Icon */}
          <span className="text-sm flex-shrink-0">
            {isVirtualRoot ? '🏢' : (hasChildren ? '📁' : '📂')}
          </span>

          {/* Group Name */}
          <div className="flex-1 min-w-0">
            {!isVirtualRoot && editingGroup === node.group.id ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSaveGroup(node.group.id);
                    if (e.key === 'Escape') {
                      setEditingGroup(null);
                      setEditingGroupName('');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveGroup(node.group.id);
                  }}
                  className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  ✓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingGroup(null);
                    setEditingGroupName('');
                  }}
                  className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className={`text-xs ${hasChildren ? 'text-gray-900' : 'text-blue-700'}`}>
                {node.group.name}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {isVirtualRoot ? (
              // Virtual root: only show +Sub button to add root groups
              <button
                onClick={() => {
                  setShowAddGroupModal(true);
                  setNewGroupName('');
                  setError(null);
                }}
                className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                title="Add root group"
              >
                +Sub
              </button>
            ) : editingGroup !== node.group.id ? (
              <>
                <button
                  onClick={() => {
                    setShowAddSubgroupModal(node.group.id);
                    setNewGroupName('');
                  }}
                  className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  title="Add subgroup"
                >
                  +Sub
                </button>
                <button
                  onClick={() => handleStartEditGroup(node.group)}
                  className="p-0.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteGroup(node.group.id)}
                  className="p-0.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Child Groups - recursively rendered */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => (
              <GroupTreeNode key={child.group.id} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 text-center">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  const selectedGroup = selectedGroupId ? findGroupById(selectedGroupId, groups) ?? null : null;

  return (
    <div className="space-y-3">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-red-800">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Compact Header */}
      <div className="bg-white rounded-lg shadow-sm p-2 border border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">Manage Teams & Groups</h2>
      </div>

      {/* Two-Column Layout - Compact */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Left Column: Groups Hierarchy */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full lg:w-[37.5%] flex-shrink-0">
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Groups</h3>
          </div>
          <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {tree.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-500">
                No groups. Click "+Sub" to create one.
              </div>
            ) : (
              <div className="space-y-0.5">
                {tree.map(node => (
                  <GroupTreeNode key={node.group.id} node={node} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teams Panel with Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full lg:w-[37.5%] flex-shrink-0">
          {/* Tabs Header */}
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center border-b-2 border-transparent">
                <button
                  onClick={() => setActiveTab('group-teams')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'group-teams'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {selectedGroup 
                    ? `Teams in Group: ${selectedGroup.name}`
                    : 'Teams in Group'
                  }
                </button>
                <button
                  onClick={() => setActiveTab('all-teams')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'all-teams'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Teams
                </button>
              </div>
              {activeTab === 'all-teams' && (
                <button
                  onClick={() => {
                    setShowAddTeamModal(true);
                    setNewTeamName('');
                    setError(null);
                  }}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 mr-2"
                  title="Add team"
                >
                  +Team
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {activeTab === 'group-teams' ? (
              <GroupTeamsTab
                selectedGroup={selectedGroup}
                groups={groups}
                teams={teams}
                unassignedTeams={unassignedTeams}
                isLeafGroup={isLeafGroup}
                editingTeam={editingTeam}
                editingTeamName={editingTeamName}
                onStartEdit={handleStartEditTeam}
                onSave={handleSaveTeam}
                onCancelEdit={() => {
                  setEditingTeam(null);
                  setEditingTeamName('');
                }}
                onEditChange={setEditingTeamName}
                onDelete={handleDeleteTeam}
                onDisconnect={handleDisconnectTeam}
                onConnect={() => selectedGroup && setShowConnectTeamModal(selectedGroup.id)}
                onAddTeam={() => {
                  setShowAddTeamModal(true);
                  setNewTeamName('');
                  setError(null);
                }}
              />
            ) : (
              <AllTeamsTab
                allTeams={allTeams}
                teamSearchQuery={teamSearchQuery}
                onSearchChange={setTeamSearchQuery}
                editingTeam={editingTeam}
                editingTeamName={editingTeamName}
                onStartEdit={handleStartEditTeam}
                onSave={handleSaveTeam}
                onCancelEdit={() => {
                  setEditingTeam(null);
                  setEditingTeamName('');
                }}
                onEditChange={setEditingTeamName}
                onDelete={handleDeleteTeam}
                onAddTeam={() => {
                  setShowAddTeamModal(true);
                  setNewTeamName('');
                  setError(null);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Compact Modals */}
      {showAddGroupModal && (
        <Modal
          title="Add Root Group"
          onClose={() => {
            setShowAddGroupModal(false);
            setNewGroupName('');
            setError(null); // Clear error when closing
          }}
        >
          <div className="space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
                {error}
              </div>
            )}
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => {
                setNewGroupName(e.target.value);
                setError(null); // Clear error when user types
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddRootGroup();
              }}
              placeholder="Group name"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => {
                  setShowAddGroupModal(false);
                  setNewGroupName('');
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRootGroup}
                disabled={!newGroupName.trim()}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showAddSubgroupModal && (
        <Modal
          title={`Add Subgroup to ${findGroupById(showAddSubgroupModal, groups)?.name}`}
          onClose={() => {
            setShowAddSubgroupModal(null);
            setNewGroupName('');
            setError(null); // Clear error when closing
          }}
        >
          <div className="space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
                {error}
              </div>
            )}
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => {
                setNewGroupName(e.target.value);
                setError(null); // Clear error when user types
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && showAddSubgroupModal) {
                  handleAddSubgroup(showAddSubgroupModal);
                }
              }}
              placeholder="Subgroup name"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => {
                  setShowAddSubgroupModal(null);
                  setNewGroupName('');
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => showAddSubgroupModal && handleAddSubgroup(showAddSubgroupModal)}
                disabled={!newGroupName.trim()}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showAddTeamModal && (
        <Modal
          title="Add Team"
          onClose={() => {
            setShowAddTeamModal(false);
            setNewTeamName('');
            setError(null); // Clear error when closing
          }}
        >
          <div className="space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
                {error}
              </div>
            )}
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => {
                setNewTeamName(e.target.value);
                setError(null); // Clear error when user types
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddTeam();
              }}
              placeholder="Team name"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            {selectedGroup && isLeafGroup(selectedGroup.id, groups) && (
              <p className="text-xs text-gray-500">
                Will connect to "{selectedGroup.name}"
              </p>
            )}
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => {
                  setShowAddTeamModal(false);
                  setNewTeamName('');
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTeam}
                disabled={!newTeamName.trim()}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showConnectTeamModal && (
        <Modal
          title={`Connect Teams to ${findGroupById(showConnectTeamModal, groups)?.name}`}
          wide={true}
          onClose={() => {
            setShowConnectTeamModal(null);
            setConnectModalSearchQuery('');
            setSelectedTeamsForConnect(new Set());
          }}
        >
          <div className="space-y-3">
            {/* Search Input - Mandatory */}
            <div className="relative">
              <input
                type="text"
                value={connectModalSearchQuery}
                onChange={(e) => setConnectModalSearchQuery(e.target.value)}
                placeholder="Search teams..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              {connectModalSearchQuery && (
                <button
                  onClick={() => setConnectModalSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Teams Table with Checkboxes */}
            {filteredAvailableTeams.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                {connectModalSearchQuery ? 'No teams found' : 'All teams connected'}
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-300 rounded" style={{ scrollbarWidth: 'thin' }}>
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-12" />
                    <col className="w-1/4" />
                    <col className="w-3/4" />
                  </colgroup>
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 border-r border-gray-300 border-b border-gray-300"></th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 border-r border-gray-300 border-b border-gray-300">Team Name</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b border-gray-300">Groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvailableTeams.map((team, idx) => {
                      const isSelected = selectedTeamsForConnect.has(team.team_name);
                      return (
                        <tr
                          key={team.team_name}
                          className={`hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50' : ''
                          } ${idx < filteredAvailableTeams.length - 1 ? 'border-b border-gray-300' : ''}`}
                        >
                          <td className="px-3 py-2 border-r border-gray-300">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTeamSelection(team.team_name)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 border-r border-gray-300">
                            <span className="text-sm font-medium text-gray-900">👥 {team.team_name}</span>
                          </td>
                          <td className="px-3 py-2">
                            {team.group_names && team.group_names.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {team.group_names.map((groupName, groupIdx) => (
                                  <span
                                    key={groupIdx}
                                    className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                                  >
                                    {groupName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selection Summary and Connect Button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-600">
                {selectedTeamsForConnect.size > 0
                  ? `${selectedTeamsForConnect.size} team${selectedTeamsForConnect.size !== 1 ? 's' : ''} selected`
                  : 'Select teams to connect'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  console.log('🔴 Connect button clicked!', { 
                    selectedTeamsCount: selectedTeamsForConnect.size,
                    showConnectTeamModal,
                    selectedTeams: Array.from(selectedTeamsForConnect)
                  });
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (!showConnectTeamModal) {
                    console.log('❌ showConnectTeamModal is null, cannot connect');
                    return;
                  }
                  
                  const selectedTeamNames = Array.from(selectedTeamsForConnect);
                  console.log('🔴 Calling handleConnectMultipleTeams with:', { groupId: showConnectTeamModal, teamNames: selectedTeamNames });
                  handleConnectMultipleTeams(showConnectTeamModal, selectedTeamNames);
                }}
                disabled={selectedTeamsForConnect.size === 0}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Connect {selectedTeamsForConnect.size > 0 ? `(${selectedTeamsForConnect.size})` : ''}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Teams in Group Tab Component
function GroupTeamsTab({
  selectedGroup,
  groups,
  teams,
  unassignedTeams,
  isLeafGroup,
  editingTeam,
  editingTeamName,
  onStartEdit,
  onSave,
  onCancelEdit,
  onEditChange,
  onDelete,
  onDisconnect,
  onConnect,
  onAddTeam,
}: {
  selectedGroup: Group | null;
  groups: Group[];
  teams: Team[];
  unassignedTeams: Team[];
  isLeafGroup: (groupId: number, allGroups: Group[]) => boolean;
  editingTeam: string | null;
  editingTeamName: string;
  onStartEdit: (team: Team) => void;
  onSave: (teamName: string) => void;
  onCancelEdit: () => void;
  onEditChange: (value: string) => void;
  onDelete: (teamName: string) => void;
  onDisconnect: (groupId: number, teamName: string) => void;
  onConnect: () => void;
  onAddTeam: () => void;
}) {
  return (
    <div className="space-y-2">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-2">
        {selectedGroup && isLeafGroup(selectedGroup.id, groups) && (
          <button
            onClick={onConnect}
            className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            +Connect
          </button>
        )}
      </div>

      {!selectedGroup ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 text-center py-3">
            Select a group to see teams
          </div>
          {unassignedTeams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5">
                Unassigned ({unassignedTeams.length})
              </h4>
              <div className="space-y-1">
                {unassignedTeams.map(team => (
                  <TeamItem
                    key={team.team_name}
                    team={team}
                    editingTeam={editingTeam}
                    editingTeamName={editingTeamName}
                    onStartEdit={onStartEdit}
                    onSave={onSave}
                    onCancelEdit={onCancelEdit}
                    onEditChange={onEditChange}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-500">
          {isLeafGroup(selectedGroup.id, groups) ? (
            <p>No teams</p>
          ) : (
            <p>Select a leaf group</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {teams.map(team => (
            <TeamItem
              key={team.team_name}
              team={team}
              editingTeam={editingTeam}
              editingTeamName={editingTeamName}
              onStartEdit={onStartEdit}
              onSave={onSave}
              onCancelEdit={onCancelEdit}
              onEditChange={onEditChange}
              onRemove={selectedGroup ? () => onDisconnect(selectedGroup.id, team.team_name) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// All Teams Tab Component
function AllTeamsTab({
  allTeams,
  teamSearchQuery,
  onSearchChange,
  editingTeam,
  editingTeamName,
  onStartEdit,
  onSave,
  onCancelEdit,
  onEditChange,
  onDelete,
  onAddTeam,
}: {
  allTeams: Team[];
  teamSearchQuery: string;
  onSearchChange: (query: string) => void;
  editingTeam: string | null;
  editingTeamName: string;
  onStartEdit: (team: Team) => void;
  onSave: (teamName: string) => void;
  onCancelEdit: () => void;
  onEditChange: (value: string) => void;
  onDelete: (teamName: string) => void;
  onAddTeam: () => void;
}) {
  // Filter teams based on search query
  const filteredTeams = useMemo(() => {
    console.log('AllTeamsTab: allTeams prop:', allTeams, 'count:', allTeams.length);
    if (!teamSearchQuery.trim()) return allTeams;
    const query = teamSearchQuery.toLowerCase();
    return allTeams.filter(team =>
      team.team_name.toLowerCase().includes(query) ||
      (team.group_names && team.group_names.some(gn => gn.toLowerCase().includes(query)))
    );
  }, [allTeams, teamSearchQuery]);

  return (
    <div className="space-y-2">
      {/* Header with Search */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={teamSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search teams..."
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {teamSearchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Teams Table */}
      {filteredTeams.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-500">
          {teamSearchQuery ? 'No teams found' : 'No teams yet'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Team Name</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Members</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Groups</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(team => (
                <tr key={team.team_name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1.5">
                    {editingTeam === team.team_name ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingTeamName}
                          onChange={(e) => onEditChange(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') onSave(team.team_name);
                            if (e.key === 'Escape') onCancelEdit();
                          }}
                          className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => onSave(team.team_name)}
                          className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">{team.team_name}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600">
                    {team.number_of_team_members || 0}
                  </td>
                  <td className="px-2 py-1.5">
                    {team.group_names && team.group_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {team.group_names.map((groupName, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {groupName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      {editingTeam !== team.team_name && (
                        <>
                          <button
                            onClick={() => onStartEdit(team)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDelete(team.team_name)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Compact Team Item Component
function TeamItem({
  team,
  editingTeam,
  editingTeamName,
  onStartEdit,
  onSave,
  onCancelEdit,
  onEditChange,
  onDelete,
  onRemove,
}: {
  team: Team;
  editingTeam: string | null;
  editingTeamName: string;
  onStartEdit: (team: Team) => void;
  onSave: (teamName: string) => void;
  onCancelEdit: () => void;
  onEditChange: (value: string) => void;
  onDelete?: (teamName: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-1.5 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100">
      <div className="flex items-center gap-1.5 flex-1">
        <span>👥</span>
        {editingTeam === team.team_name ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editingTeamName}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') onSave(team.team_name);
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => onSave(team.team_name)}
              className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ✓
            </button>
            <button
              onClick={onCancelEdit}
              className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <span className="text-xs font-medium text-gray-900">{team.team_name}</span>
            {team.number_of_team_members > 0 && (
              <span className="ml-2 text-xs text-gray-500">({team.number_of_team_members} members)</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {editingTeam !== team.team_name && (
          <>
            <button
              onClick={() => onStartEdit(team)}
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded"
                title="Disconnect Team"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(team.team_name)}
                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Compact Modal Component
function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`bg-white rounded-lg shadow-xl ${wide ? 'max-w-3xl w-full mx-4' : 'max-w-sm w-full mx-4'}`}>
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`p-3 ${wide ? 'max-h-[80vh] overflow-y-auto' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
