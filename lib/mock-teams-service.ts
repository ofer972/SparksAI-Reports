/**
 * Mock service for Teams and Groups management
 * 
 * Real API endpoints:
 * - getGroupsHierarchy() -> GET /api/v1/groups/hierarchy
 * - getTeamsByGroup(groupName) -> GET /api/v1/teams/by-group/{group_name}
 * 
 * For CRUD operations (to be implemented):
 * - createGroup(name, parentId?) -> POST /api/v1/groups
 * - updateGroup(id, name) -> PUT /api/v1/groups/{id}
 * - deleteGroup(id) -> DELETE /api/v1/groups/{id}
 * - createTeam(name) -> POST /api/v1/teams
 * - updateTeam(id, name) -> PUT /api/v1/teams/{id}
 * - deleteTeam(id) -> DELETE /api/v1/teams/{id}
 * - connectTeamToGroup(teamName, groupName) -> POST /api/v1/groups/{groupName}/teams/{teamName}
 * - disconnectTeamFromGroup(teamName, groupName) -> DELETE /api/v1/groups/{groupName}/teams/{teamName}
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

// Mock data matching the real API structure
const mockGroupsHierarchy: Group[] = [
  { id: 1, name: 'Organization Root', parent_id: null },
  { id: 10, name: 'Engineering', parent_id: 1 },
  { id: 11, name: 'Product Development', parent_id: 10 },
  { id: 12, name: 'Core Platform', parent_id: 10 },
  { id: 20, name: 'Marketing', parent_id: 1 },
];

const mockTeamsByGroup: Record<string, Team[]> = {
  'Engineering': [
    {
      team_name: 'Team Alpha',
      group_names: ['Engineering', 'Backend'],
      number_of_team_members: 5,
    },
    {
      team_name: 'Team Beta',
      group_names: ['Engineering'],
      number_of_team_members: 3,
    },
  ],
  'Product Development': [
    {
      team_name: 'Frontend Team',
      group_names: ['Product Development'],
      number_of_team_members: 4,
    },
  ],
  'Core Platform': [
    {
      team_name: 'Backend Team',
      group_names: ['Core Platform'],
      number_of_team_members: 6,
    },
    {
      team_name: 'API Team',
      group_names: ['Core Platform'],
      number_of_team_members: 3,
    },
  ],
  'Marketing': [
    {
      team_name: 'Marketing Team',
      group_names: ['Marketing'],
      number_of_team_members: 8,
    },
  ],
};

// Storage for runtime modifications (in real app, this would be API calls)
let groups: Group[] = [...mockGroupsHierarchy];
let teamsByGroup: Record<string, Team[]> = { ...mockTeamsByGroup };

/**
 * Get all groups hierarchy (flat list with parent_id)
 * Real endpoint: GET /api/v1/groups/hierarchy
 */
export async function getGroupsHierarchy(): Promise<Group[]> {
  const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.groups.getHierarchy));
  if (!response.ok) {
    throw new Error(`Failed to fetch groups hierarchy: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

/**
 * Get teams for a specific group by group name
 * Real endpoint: GET /api/v1/teams/by-group/{group_name}
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

// CRUD operations (to be implemented with real endpoints)
export async function createGroup(name: string, parentId?: number): Promise<Group> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newGroup: Group = {
    id: Date.now(),
    name: name.trim(),
    parent_id: parentId || null,
  };
  groups.push(newGroup);
  return newGroup;
}

export async function updateGroup(id: number, name: string): Promise<Group> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const group = groups.find(g => g.id === id);
  if (!group) {
    throw new Error(`Group with id ${id} not found`);
  }
  group.name = name.trim();
  return group;
}

export async function deleteGroup(id: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const findChildren = (parentId: number): number[] => {
    const children = groups.filter(g => g.parent_id === parentId).map(g => g.id);
    const allChildren = [...children];
    children.forEach(childId => {
      allChildren.push(...findChildren(childId));
    });
    return allChildren;
  };
  
  const allGroupIdsToDelete = [id, ...findChildren(id)];
  groups = groups.filter(g => !allGroupIdsToDelete.includes(g.id));
  
  // Remove teams from deleted groups
  Object.keys(teamsByGroup).forEach(groupName => {
    const group = groups.find(g => g.name === groupName);
    if (!group) {
      delete teamsByGroup[groupName];
    }
  });
}

export async function createTeam(name: string): Promise<Team> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newTeam: Team = {
    team_name: name.trim(),
    group_names: [],
    number_of_team_members: 0,
  };
  return newTeam;
}

export async function updateTeam(teamName: string, newName: string): Promise<Team> {
  await new Promise(resolve => setTimeout(resolve, 500));
  // Find team in all groups
  for (const groupName in teamsByGroup) {
    const team = teamsByGroup[groupName].find(t => t.team_name === teamName);
    if (team) {
      team.team_name = newName.trim();
      return team;
    }
  }
  throw new Error(`Team ${teamName} not found`);
}

export async function deleteTeam(teamName: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  for (const groupName in teamsByGroup) {
    teamsByGroup[groupName] = teamsByGroup[groupName].filter(t => t.team_name !== teamName);
  }
}

export async function connectTeamToGroup(teamName: string, groupName: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (!teamsByGroup[groupName]) {
    teamsByGroup[groupName] = [];
  }
  
  // Check if team already exists in this group
  const exists = teamsByGroup[groupName].some(t => t.team_name === teamName);
  if (!exists) {
    // Find team in other groups or create new
    let team: Team | undefined;
    for (const gName in teamsByGroup) {
      team = teamsByGroup[gName].find(t => t.team_name === teamName);
      if (team) break;
    }
    
    if (!team) {
      team = {
        team_name: teamName,
        group_names: [],
        number_of_team_members: 0,
      };
    }
    
    // Add group to team's group_names if not already there
    if (!team.group_names.includes(groupName)) {
      team.group_names.push(groupName);
    }
    
    // Add team to group if not already there
    if (!teamsByGroup[groupName].some(t => t.team_name === teamName)) {
      teamsByGroup[groupName].push(team);
    }
  }
}

export async function disconnectTeamFromGroup(teamName: string, groupName: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (teamsByGroup[groupName]) {
    teamsByGroup[groupName] = teamsByGroup[groupName].filter(t => t.team_name !== teamName);
    
    // Remove group from team's group_names
    for (const gName in teamsByGroup) {
      const team = teamsByGroup[gName].find(t => t.team_name === teamName);
      if (team) {
        team.group_names = team.group_names.filter(gn => gn !== groupName);
      }
    }
  }
}
