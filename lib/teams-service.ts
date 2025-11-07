/**
 * Teams and Groups service
 * 
 * API endpoints (new structure):
 * - getGroupsHierarchy() -> GET /api/v1/groups
 * - getTeamsByGroup(groupId) -> GET /api/v1/groups/{groupId}/teams
 * - createGroup(name, parentGroupId?) -> POST /api/v1/groups
 * - updateGroup(groupId, name?, parentGroupId?) -> PATCH /api/v1/groups/{groupId}
 * - deleteGroup(groupId) -> DELETE /api/v1/groups/{groupId}
 * - getAllTeams() -> GET /api/v1/teams
 * - createTeam(name, groupId?, members?) -> POST /api/v1/teams
 * - updateTeam(teamId, name?, members?, groupId?) -> PATCH /api/v1/teams/{teamId}
 * - deleteTeam(teamId) -> DELETE /api/v1/teams/{teamId}
 * - connectTeamsToGroup(teamIds[], groupId) -> PUT /api/v1/teams/batch-assign
 * - disconnectTeamFromGroup(teamId) -> DELETE /api/v1/teams/{teamId}/group
 */

import { API_CONFIG, buildBackendUrl } from './config';

// Match the new API response structure
export interface Group {
  id: number; // group_key from API
  name: string; // group_name from API
  parent_id: number | null; // parent_group_key from API
}

export interface Team {
  team_key: number; // ID from API
  team_name: string; // Name from API
  number_of_team_members: number;
  group_key: number | null; // Current group ID (null if unassigned)
  group_name?: string; // Group name (from JOIN, optional)
}

export interface TeamsByGroupResponse {
  success: boolean;
  data: {
    teams: Team[];
    count: number;
    group_key: number;
  };
  message: string;
}

/**
 * Get all groups hierarchy (flat list with parent_id)
 * Endpoint: GET /api/v1/groups
 * Response: { success: true, data: { groups: [...], count: number }, message: string }
 */
export async function getGroupsHierarchy(): Promise<Group[]> {
  const url = buildBackendUrl(API_CONFIG.endpoints.groups.getHierarchy);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to fetch groups hierarchy: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
  
  // New API format: { success: true, data: { groups: [...], count: number }, message: "..." }
  if (data && data.success && data.data && Array.isArray(data.data.groups)) {
    // Map API response to our interface: group_key -> id, group_name -> name, parent_group_key -> parent_id
    return data.data.groups.map((g: any) => ({
      id: g.id, // API returns 'id' (which is group_key)
      name: g.name, // API returns 'name' (which is group_name)
      parent_id: g.parent_id, // API returns 'parent_id' (which is parent_group_key)
    }));
  }
  
  // If no groups found, API returns empty array in data.groups
  if (data && data.success && data.data && Array.isArray(data.data.groups)) {
    return [];
  }
  
  // Fallback for unexpected format
  return [];
  } catch (error) {
    // Log the error for debugging (especially on Railway)
    console.error('Error fetching groups hierarchy:', error);
    console.error('Request URL:', url);
    
    // Re-throw with more context
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error: Failed to connect to backend. Check INTERNAL_BACKEND_URL configuration.`);
    }
    throw error;
  }
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
  
  // New API format: { success: true, data: { teams: [...], count: number }, message: "..." }
  if (data && data.success && data.data && Array.isArray(data.data.teams)) {
    return data.data.teams;
  }
  
  // If no teams found, API returns empty array in data.teams
  return [];
}

/**
 * Get teams for a specific group by group ID
 * Endpoint: GET /api/v1/groups/{groupId}/teams
 * Response: { success: true, data: { teams: [...], count: number, group_key: number }, message: string }
 */
export async function getTeamsByGroup(groupId: number): Promise<TeamsByGroupResponse> {
  const url = buildBackendUrl(`${API_CONFIG.endpoints.groups.getTeamsByGroup}/${groupId}/teams`);
  const response = await fetch(url);
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
 * Body: { group_name: string, parent_group_key?: number | null }
 * Response: { success: true, data: { group: { group_key: number, group_name: string, parent_group_key: number | null } }, message: string }
 */
export async function createGroup(name: string, parentGroupId?: number | null): Promise<Group> {
  const body: { group_name: string; parent_group_key?: number | null } = { 
    group_name: name.trim() 
  };
  if (parentGroupId !== undefined) {
    body.parent_group_key = parentGroupId;
  } else {
    body.parent_group_key = null;
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
  
  // New API format: { success: true, data: { group: { group_key, group_name, parent_group_key } }, message: "..." }
  if (result.success && result.data && result.data.group) {
    const groupData = result.data.group;
    return {
      id: groupData.group_key, // API returns group_key as the ID
      name: groupData.group_name,
      parent_id: groupData.parent_group_key,
    };
  }
  
  throw new Error('Unexpected response format from create group endpoint');
}

/**
 * Update an existing group
 * Endpoint: PATCH /api/v1/groups/{groupId}
 * Body: { group_name?: string, parent_group_key?: number | null }
 * Response: { success: true, data: { group: { group_key: number, group_name: string, parent_group_key: number | null } }, message: string }
 */
export async function updateGroup(
  groupId: number,
  updates: { name?: string; parentGroupId?: number | null }
): Promise<Group> {
  const body: { group_name?: string; parent_group_key?: number | null } = {};
  if (updates.name) {
    body.group_name = updates.name.trim();
  }
  if (updates.parentGroupId !== undefined) {
    body.parent_group_key = updates.parentGroupId;
  }

  const url = buildBackendUrl(`${API_CONFIG.endpoints.groups.update}/${groupId}`);

  const response = await fetch(url, {
    method: 'PATCH',
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
  
  // New API format: { success: true, data: { group: { group_key, group_name, parent_group_key } }, message: "..." }
  if (result.success && result.data && result.data.group) {
    const groupData = result.data.group;
    return {
      id: groupData.group_key,
      name: groupData.group_name,
      parent_id: groupData.parent_group_key,
    };
  }
  
  throw new Error('Unexpected response format from update group endpoint');
}

/**
 * Delete a group permanently (moves teams to null)
 * Endpoint: DELETE /api/v1/groups/{groupId}
 * Response: { success: true, data: { id: number }, message: string }
 */
export async function deleteGroup(groupId: number): Promise<void> {
  const response = await fetch(buildBackendUrl(`${API_CONFIG.endpoints.groups.delete}/${groupId}`), {
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
 * Body: { team_name: string, number_of_team_members?: number, group_key?: number | null }
 * Response: { success: true, data: { team: { team_key: number, team_name: string, number_of_team_members: number, group_key: number | null } }, message: string }
 */
export async function createTeam(name: string, groupId?: number | null, members?: number): Promise<Team> {
  const body: { team_name: string; number_of_team_members?: number; group_key?: number | null } = {
    team_name: name.trim(),
  };
  if (members !== undefined) {
    body.number_of_team_members = members;
  }
  if (groupId !== undefined) {
    body.group_key = groupId;
  }

  const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.teams.create), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    
    // Handle 409 Conflict (duplicate team)
    if (response.status === 409) {
      throw new Error(`Team "${name.trim()}" already exists`);
    }
    
    throw new Error(error.message || `Failed to create team: ${response.statusText}`);
  }

  const result = await response.json();
  // New API format: { success: true, data: { team: {...} }, message: "..." }
  if (result.success && result.data && result.data.team) {
    return result.data.team;
  }
  throw new Error('Unexpected response format from create team endpoint');
}

/**
 * Update an existing team
 * Endpoint: PATCH /api/v1/teams/{teamId}
 * Body: { team_name?: string, number_of_team_members?: number, group_key?: number | null }
 * Response: { success: true, data: { team: { team_key: number, team_name: string, number_of_team_members: number, group_key: number | null } }, message: string }
 */
export async function updateTeam(
  teamId: number,
  updates: { teamName?: string; number_of_team_members?: number; groupId?: number | null }
): Promise<Team> {
  const body: { team_name?: string; number_of_team_members?: number; group_key?: number | null } = {};
  if (updates.teamName) {
    body.team_name = updates.teamName.trim();
  }
  if (updates.number_of_team_members !== undefined) {
    body.number_of_team_members = updates.number_of_team_members;
  }
  if (updates.groupId !== undefined) {
    body.group_key = updates.groupId;
  }

  const response = await fetch(buildBackendUrl(`${API_CONFIG.endpoints.teams.update}/${teamId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to update team: ${response.statusText}`);
  }

  const result = await response.json();
  // New API format: { success: true, data: { team: {...} }, message: "..." }
  if (result.success && result.data && result.data.team) {
    return result.data.team;
  }
  throw new Error('Unexpected response format from update team endpoint');
}

/**
 * Delete a team permanently
 * Endpoint: DELETE /api/v1/teams/{teamId}
 * Response: { success: true, data: { id: number }, message: string }
 */
export async function deleteTeam(teamId: number): Promise<void> {
  const response = await fetch(buildBackendUrl(`${API_CONFIG.endpoints.teams.delete}/${teamId}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to delete team: ${response.statusText}`);
  }
}

/**
 * Add a team to a group (single team) - convenience wrapper
 */
export async function connectTeamToGroup(teamId: number, groupId: number): Promise<void> {
  // Use the bulk function for single team
  await connectTeamsToGroup([teamId], groupId);
}

/**
 * Add multiple teams to a group in one call (batch assign)
 * Endpoint: PUT /api/v1/teams/batch-assign
 * Body: { group_id: number, team_ids: number[] }
 * Response: { success: true, data: { updated_teams: number, group_id: number, team_ids: number[] }, message: string }
 */
export async function connectTeamsToGroup(teamIds: number[], groupId: number): Promise<{
  updated_teams: number;
  group_id: number;
  team_ids: number[];
}> {
  const url = buildBackendUrl(API_CONFIG.endpoints.teamGroups.batchAssign);
  
  // Request body with group_id and team_ids array
  const body = JSON.stringify({ 
    group_id: groupId,
    team_ids: teamIds 
  });
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
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
        updated_teams: result.data.updated_teams || 0,
        group_id: result.data.group_id || groupId,
        team_ids: result.data.team_ids || teamIds,
      };
    }
    
    throw new Error('Unexpected response format from batch assign endpoint');
  } catch (error) {
    // Log network errors for debugging
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error connecting teams to group:', error);
      throw new Error('Network error: Failed to connect teams. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Remove a team from a group (set group_key to NULL)
 * Endpoint: DELETE /api/v1/teams/{teamId}/group
 * Response: { success: true, data: { team: { team_key: number, team_name: string, number_of_team_members: number, group_key: null } }, message: string }
 */
export async function disconnectTeamFromGroup(teamId: number): Promise<void> {
  // Build the URL: DELETE /api/v1/teams/{teamId}/group
  const url = buildBackendUrl(`${API_CONFIG.endpoints.teamGroups.removeFromGroup}/${teamId}/group`);
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Failed to disconnect team from group: ${response.statusText}`);
    }
  } catch (error) {
    // Log network errors for debugging
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error disconnecting team from group:', error);
      throw new Error('Network error: Failed to disconnect team. Please check your connection.');
    }
    throw error;
  }
}
