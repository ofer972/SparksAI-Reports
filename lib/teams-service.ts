/**
 * Teams and Groups service
 * 
 * API endpoints:
 * - getGroupsHierarchy() -> GET /api/v1/groups/hierarchy
 * - getTeamsByGroup(groupName) -> GET /api/v1/teams/by-group/{group_name}
 * - createGroup(name, parentGroupName?) -> POST /api/v1/groups
 * - updateGroup(groupName, newName?, parentGroupName?) -> PUT /api/v1/groups/{group_name}
 * - deleteGroup(groupName) -> DELETE /api/v1/groups/{group_name}
 * - createTeam(name) -> POST /api/v1/teams
 * - updateTeam(teamName, newName?, groupNames?) -> PUT /api/v1/teams/{team_name}
 * - deleteTeam(teamName) -> DELETE /api/v1/teams/{team_name}
 * - connectTeamToGroup(teamName, groupName) -> POST /api/v1/groups/{group_name}/teams (body: { "team_names": [...] })
 * - connectTeamsToGroup(teamNames[], groupName) -> POST /api/v1/groups/{group_name}/teams (body: { "team_names": [...] })
 * - disconnectTeamFromGroup(teamName, groupName) -> DELETE /api/v1/teams/{team_name}/groups (body: { "group_name": "..." })
 */

import { API_CONFIG, buildBackendUrl } from './config';

// Match the real API response structure
export interface Group {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface Team {
  team_name: string;
  group_names: string[];
  number_of_team_members: number;
}

export interface TeamsByGroupResponse {
  success: boolean;
  data: {
    teams: Team[];
    count: number;
    group_name: string;
  };
  message: string;
}

/**
 * Get all groups hierarchy (flat list with parent_id)
 * Endpoint: GET /api/v1/groups/hierarchy
 */
export async function getGroupsHierarchy(): Promise<Group[]> {
  const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.groups.getHierarchy));
  if (!response.ok) {
    throw new Error(`Failed to fetch groups hierarchy: ${response.statusText}`);
  }
  const data = await response.json();
  
  // Handle different response formats:
  // 1. Direct array: [ {...}, {...} ]
  // 2. Wrapped in ApiResponse: { success: true, data: [...], message: "..." }
  // 3. Empty response or other structure
  
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data;
  }
  
  // If no groups found or unexpected format, return empty array
  return [];
}

/**
 * Get all teams
 * Endpoint: GET /api/v1/teams
 */
export async function getAllTeams(): Promise<Team[]> {
  const url = buildBackendUrl(API_CONFIG.endpoints.teams.getAll);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch teams: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data && typeof data === 'object') {
    // Check for { success: true, data: { teams: [...] } } format (most common)
    if (data.data && typeof data.data === 'object' && Array.isArray(data.data.teams)) {
      return data.data.teams;
    }
    
    // Check for data.teams (array of teams) - direct format
    if (Array.isArray(data.teams)) {
      return data.teams;
    }
    
    // Check for data.data (array) - alternative format
    if (Array.isArray(data.data)) {
      return data.data;
    }
  }
  
  // If no teams found or unexpected format, return empty array
  return [];
}

/**
 * Get teams for a specific group by group name
 * Endpoint: GET /api/v1/teams/by-group/{group_name}
 */
export async function getTeamsByGroup(groupName: string): Promise<TeamsByGroupResponse> {
  const response = await fetch(buildBackendUrl(`${API_CONFIG.endpoints.teams.getByGroup}/${encodeURIComponent(groupName)}`));
  if (!response.ok) {
    throw new Error(`Failed to fetch teams for group: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

/**
 * Helper: Get child groups of a parent group (synchronous)
 */
export function getChildGroups(parentId: number | null, allGroups: Group[]): Group[] {
  return allGroups.filter(g => g.parent_id === parentId);
}

/**
 * Helper: Check if a group is a leaf (has no children)
 */
export function isLeafGroup(groupId: number, allGroups: Group[]): boolean {
  return !allGroups.some(g => g.parent_id === groupId);
}

/**
 * Helper: Find group by name
 */
export function findGroupByName(name: string, allGroups: Group[]): Group | undefined {
  return allGroups.find(g => g.name === name);
}

/**
 * Helper: Find group by id
 */
export function findGroupById(id: number, allGroups: Group[]): Group | undefined {
  return allGroups.find(g => g.id === id);
}

/**
 * Create a new group
 * Endpoint: POST /api/v1/groups
 * Body: { group_name: string, parent_group_name?: string }
 * Response: { success: true, data: { group: { group_name: string, parent_group_name: string | null } }, message: string }
 */
export async function createGroup(name: string, parentGroupName?: string): Promise<Group> {
  const body: { group_name: string; parent_group_name?: string | null } = { 
    group_name: name.trim() 
  };
  if (parentGroupName) {
    body.parent_group_name = parentGroupName;
  } else {
    body.parent_group_name = null;
  }

  const url = buildBackendUrl(API_CONFIG.endpoints.groups.create);
  const requestBody = JSON.stringify(body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: requestBody,
  });


  if (!response.ok) {
    // Handle 409 Conflict (duplicate group)
    if (response.status === 409) {
      throw new Error(`Group "${name.trim()}" already exists`);
    }
    
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText || response.statusText };
    }
    throw new Error(error.message || `Failed to create group: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Handle response structure: { success: true, data: { group: {...} }, message: "..." }
  if (result.success && result.data && result.data.group) {
    const groupData = result.data.group;
    // Convert to Group interface format (with id and parent_id)
    // Note: The API returns group_name and parent_group_name, but we need to fetch the full hierarchy
    // to get the id. For now, we'll return a temporary structure.
    // The component will refresh the groups list after creation.
    return {
      id: 0, // Will be updated when groups are refreshed
      name: groupData.group_name,
      parent_id: null, // Will be updated when groups are refreshed
    };
  }
  
  throw new Error('Unexpected response format from create group endpoint');
}

/**
 * Update an existing group
 * Endpoint: PUT /api/v1/groups/{group_name}
 * Body: { group_name?: string, parent_group_name?: string }
 * Response: { success: true, data: { group: { group_name: string, parent_group_name: string | null } }, message: string }
 */
export async function updateGroup(
  groupName: string,
  updates: { name?: string; parentGroupName?: string }
): Promise<Group> {
  const body: { group_name?: string; parent_group_name?: string | null } = {};
  if (updates.name) {
    body.group_name = updates.name.trim();
  }
  if (updates.parentGroupName !== undefined) {
    body.parent_group_name = updates.parentGroupName || null;
  }

  const url = buildBackendUrl(`${API_CONFIG.endpoints.groups.update}/${encodeURIComponent(groupName)}`);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });


  if (!response.ok) {
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText || response.statusText };
    }
    throw new Error(error.message || `Failed to update group: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Handle response structure: { success: true, data: { group: {...} }, message: "..." }
  if (result.success && result.data && result.data.group) {
    const groupData = result.data.group;
    // Convert to Group interface format (with id and parent_id)
    // The component will refresh the groups list after update to get the correct id.
    return {
      id: 0, // Will be updated when groups are refreshed
      name: groupData.group_name,
      parent_id: null, // Will be updated when groups are refreshed
    };
  }
  
  throw new Error('Unexpected response format from update group endpoint');
}

/**
 * Delete a group permanently
 * Endpoint: DELETE /api/v1/groups/{group_name}
 */
export async function deleteGroup(groupName: string): Promise<void> {
  const response = await fetch(buildBackendUrl(`${API_CONFIG.endpoints.groups.delete}/${encodeURIComponent(groupName)}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to delete group: ${response.statusText}`);
  }
}

/**
 * Create a new team
 * Endpoint: POST /api/v1/teams
 * Body: { team_name: string }
 */
export async function createTeam(name: string): Promise<Team> {
  const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.teams.create), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ team_name: name.trim() }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    
    // Handle 409 Conflict (duplicate team)
    if (response.status === 409) {
      throw new Error(`Team "${name.trim()}" already exists`);
    }
    
    throw new Error(error.message || `Failed to create team: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Update an existing team
 * Endpoint: PUT /api/v1/teams/{team_name}
 * Body: { team_name?: string, group_names?: string[] }
 */
export async function updateTeam(
  teamName: string,
  updates: { teamName?: string; groupNames?: string[] }
): Promise<Team> {
  const body: { team_name?: string; group_names?: string[] } = {};
  if (updates.teamName) {
    body.team_name = updates.teamName.trim();
  }
  if (updates.groupNames !== undefined) {
    body.group_names = updates.groupNames;
  }

  const response = await fetch(buildBackendUrl(`${API_CONFIG.endpoints.teams.update}/${encodeURIComponent(teamName)}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to update team: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Delete a team permanently
 * Endpoint: DELETE /api/v1/teams/{team_name}
 */
export async function deleteTeam(teamName: string): Promise<void> {
  const response = await fetch(buildBackendUrl(`${API_CONFIG.endpoints.teams.delete}/${encodeURIComponent(teamName)}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to delete team: ${response.statusText}`);
  }
}

/**
 * Add a team to a group (single team)
 * Endpoint: POST /api/v1/groups/{group_name}/teams
 * Body: { "team_names": ["Team 1"] }
 */
export async function connectTeamToGroup(teamName: string, groupName: string): Promise<void> {
  // Use the bulk function for single team
  return connectTeamsToGroup([teamName], groupName);
}

/**
 * Add multiple teams to a group in one call
 * Endpoint: POST /api/v1/groups/{group_name}/teams
 * Body: { "team_names": ["Team 1", "Team 2", ...] }
 * Response: { success: true, data: { group_name, teams_added, teams_skipped, total_requested, total_added, total_skipped }, message }
 */
export async function connectTeamsToGroup(teamNames: string[], groupName: string): Promise<{
  teams_added: string[];
  teams_skipped: string[];
  total_requested: number;
  total_added: number;
  total_skipped: number;
}> {
  // Build the URL: POST /api/v1/groups/{group_name}/teams
  const encodedGroupName = encodeURIComponent(groupName);
  const url = buildBackendUrl(`${API_CONFIG.endpoints.groups.getAll}/${encodedGroupName}/teams`);
  
  // Request body with team_names array
  const body = JSON.stringify({ team_names: teamNames });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to connect teams to group: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.success && result.data) {
    return {
      teams_added: result.data.teams_added || [],
      teams_skipped: result.data.teams_skipped || [],
      total_requested: result.data.total_requested || 0,
      total_added: result.data.total_added || 0,
      total_skipped: result.data.total_skipped || 0,
    };
  }
  
  // Fallback if response format is different
  return {
    teams_added: teamNames,
    teams_skipped: [],
    total_requested: teamNames.length,
    total_added: teamNames.length,
    total_skipped: 0,
  };
}

/**
 * Remove a team from a group
 * Endpoint: DELETE /api/v1/teams/{team_name}/groups
 * Body: { "group_name": "Eng Group2" }
 */
export async function disconnectTeamFromGroup(teamName: string, groupName: string): Promise<void> {
  // Build the URL: DELETE /api/v1/teams/{team_name}/groups
  const encodedTeamName = encodeURIComponent(teamName);
  const url = buildBackendUrl(`${API_CONFIG.endpoints.teams.removeFromGroup}/${encodedTeamName}/groups`);
  
  // Request body with group_name
  const body = JSON.stringify({ group_name: groupName });
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to disconnect team from group: ${response.statusText}`);
  }
}
