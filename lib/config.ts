// API Configuration
// Simple: Always use /api paths. Next.js rewrites handle routing to backend.

// Get Jira URL
export const getJiraUrl = (): string => {
  return process.env.NEXT_PUBLIC_JIRA_URL || 'https://argus-sec.atlassian.net/';
};

// Helper to build clean Jira URL (remove trailing slash)
export const getCleanJiraUrl = (): string => {
  const jiraUrl = getJiraUrl();
  return jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
};

export const API_CONFIG = {
  baseUrl: '/api', // Always use /api - Next.js rewrites handle backend routing
  version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  
  endpoints: {
    // Team endpoints
    teams: {
      getNames: '/teams/getNames',
      getAll: '/teams',
      getByGroup: '/teams/by-group',
      getByName: '/teams',
      create: '/teams',
      update: '/teams',
      delete: '/teams',
      addToGroup: '/teams',
      removeFromGroup: '/teams',
    },
    
    // Groups endpoints (new structure: /api/v1/groups)
    groups: {
      getAll: '/groups',
      getHierarchy: '/groups',
      getTeamsByGroup: '/groups', // Will append /{groupId}/teams
      create: '/groups',
      update: '/groups', // Will append /{groupId}
      delete: '/groups', // Will append /{groupId}
    },
    
    // Team-Group assignment endpoints
    teamGroups: {
      batchAssign: '/teams/batch-assign',
      removeFromGroup: '/teams', // Will append /{teamId}/group
    },
    
    // PI endpoints
    pis: {
      getPis: '/pis/getPis',
      getPredictability: '/pis/predictability',
      getBurndown: '/pis/burndown',
      getScopeChanges: '/pis/scope-changes',
      getPIStatusForToday: '/pis/get-pi-status-for-today',
      getWIP: '/pis/WIP',
    },
    
    // Burndown endpoints
    burndown: {
      sprintBurndown: '/team-metrics/sprint-burndown',
    },
    
    // AI Cards endpoints
    aiCards: {
      getCards: '/team-ai-cards/getCards',
    },
    
    // Recommendations endpoints
    recommendations: {
      getTop: '/recommendations/getTeamTop',
    },
    
    // Team Metrics endpoints
    teamMetrics: {
      avgSprintMetrics: '/team-metrics/get-avg-sprint-metrics',
      currentSprintProgress: '/team-metrics/current-sprint-progress',
      closedSprints: '/team-metrics/closed-sprints',
      issuesTrend: '/team-metrics/issues-trend',
    },
    
    // General Data endpoints
    generalData: {
      agentJobs: '/agent-jobs',
      agentJobDetail: '/agent-jobs',
      teamAICards: '/team-ai-cards',
      teamAICardDetail: '/team-ai-cards',
      createTeamJob: '/agent-jobs/create-team-job',
      createPiJob: '/agent-jobs/create-pi-job',
      createPiJobForTeam: '/agent-jobs/create-pi-job-for-team',
    },
    
    // Transcript Upload endpoints
    transcripts: {
      uploadTeam: '/transcripts/upload-team',
      uploadPI: '/transcripts/upload-pi',
    },

    // Settings endpoints
    settings: {
      get: '/settings/getAll',
      update: '/settings',
      batch: '/settings/batch',
    },

    // Users endpoints
    users: {
      getCurrentUser: '/users/get-current-user',
    },
    
    // Issues endpoints
    issues: {
      epicsHierarchy: '/issues/epics-hierarchy',
      issueStatusDuration: '/issues/issue-status-duration',
      issueStatusDurationWithKeys: '/issues/issue-status-duration-with-issue-keys',
      issueStatusDurationPerMonth: '/issues/issue-status-duration-per-month',
      releasePredictability: '/issues/release-predictability',
      issuesGroupedByPriority: '/issues/issues-grouped-by-priority',
      issuesGroupedByTeam: '/issues/issues-grouped-by-team',
      epicOutboundDependencyLoadByQuarter: '/issues/epic-outbound-dependency-metrics-by-quarter',
      epicInboundDependencyLoadByQuarter: '/issues/epic-inbound-dependency-load-by-quarter',
    },
    
    // Sprints endpoints
    sprints: {
      sprintPredictability: '/sprints/sprint-predictability',
      activeSprintSummaryByTeam: '/sprints/active-sprint-summary-by-team',
    },
    
  },
} as const;


/**
 * Build URL for backend API endpoints
 * Always returns relative paths like /api/v1/{endpoint}
 * Next.js rewrites handle routing to the actual backend server
 * 
 * @param endpoint - Resource path (will be prefixed with /api/v1)
 * @returns Full URL: /api/v1/{endpoint}
 * 
 * @example
 * buildBackendUrl('/teams/getNames') → '/api/v1/teams/getNames'
 */
export const buildBackendUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.baseUrl;
  const version = API_CONFIG.version;
  
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Build versioned path: /api/v1/teams/getNames
  return `${baseUrl}/${version}${cleanEndpoint}`;
};

// Type definitions for API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface User {
  user_id: string | number;
  user_name: string;
  user_type: string;
  // Keep for backward compatibility
  id?: string | number;
  email?: string;
  name?: string;
  username?: string;
  [key: string]: any; // Allow for additional fields from API
}

export interface Team {
  name: string;
}

export interface TeamsResponse {
  teams: string[];
  count: number;
}

export interface PI {
  pi_name: string;
  start_date: string;
  end_date: string;
  planning_grace_days: number;
  prep_grace_days: number;
  updated_at: string;
}

export interface PIsResponse {
  pis: PI[];
  count: number;
}

export interface AICard {
  id: number;
  date: string;
  team_name: string;
  card_name: string;
  card_type: string;
  priority: string;
  source: string;
  source_job_id?: string | number;
  description: string;
  full_information: string;
  information_json?: string;
}

export interface AICardsResponse {
  ai_cards: AICard[];
  count: number;
  team_name: string;
  limit: number;
}

export interface Recommendation {
  id: number;
  team_name: string;
  date: string;
  action_text: string;
  rational: string;
  full_information: string;
  priority: string;
  status: string;
  information_json?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  count: number;
  team_name: string;
  limit: number;
}

export interface PIStatusForTodayItem {
  pi_name?: string;
  pi_start_date?: string;
  pi_end_date?: string;
  latest_snapshot_date?: string;
  planned_epics?: number;
  added_epics?: number;
  removed_epics?: number;
  closed_epics?: number;
  remaining_epics?: number;
  ideal_remaining?: number;
  total_issues?: number;
  progress_delta_pct: number;
  progress_delta_pct_status: 'red' | 'yellow' | 'green';
  [key: string]: any; // Allow other fields in response
}

export interface PIStatusForTodayResponse {
  data: PIStatusForTodayItem[];
  count: number;
  message: string;
}

export interface PIWIPResponse {
  count_in_progress: number;
  count_in_progress_status: 'red' | 'yellow' | 'green';
  total_epics: number;
  in_progress_percentage: number;
  pi: string;
  team: string;
  project: string | null;
}

export interface EpicDependencyItem {
  pi?: string;
  team_name_of_epic?: string;
  [key: string]: any; // Allow other fields from endpoint
}

export interface SprintMetrics {
  velocity: number;
  cycle_time: number;
  predictability: number;
  velocity_status?: 'red' | 'yellow' | 'green';
  cycle_time_status?: 'red' | 'yellow' | 'green';
  predictability_status?: 'red' | 'yellow' | 'green';
  team_name: string;
  sprint_count: number;
}

export interface CompletionRate {
  days_left?: number;
  days_in_sprint?: number;
  total_issues: number;
  completed_issues: number;
  in_progress_issues: number;
  todo_issues: number;
  percent_completed: number;
  percent_completed_status?: 'red' | 'yellow' | 'green';
  in_progress_issues_status?: 'red' | 'yellow' | 'green';
  team_name: string;
}

export interface ClosedSprint {
  sprint_id: number;
  sprint_name: string;
  start_date: string;
  end_date: string;
  sprint_goal: string;
  completion_percentage: number;
  issues_planned: number;
  issues_added: number;
  issues_done: number;
  issues_remaining: number;
  velocity: number;
  predictability: number;
  cycle_time: number;
}

export interface ClosedSprintsResponse {
  closed_sprints: ClosedSprint[];
  count: number;
  team_name: string;
  months_looked_back: number;
}

export interface IssuesTrendDataPoint {
  report_month: string;
  team_name: string;
  issue_type: string;
  issues_created: number;
  issues_resolved: number;
  cumulative_open_issues: number;
}

export interface IssuesTrendResponse {
  team_name: string;
  months: number;
  issue_type: string;
  trend_data: IssuesTrendDataPoint[];
  count: number;
}

export interface PIPredictabilityData {
  [key: string]: any; // Dynamic structure based on API response
}

export interface PIPredictabilityResponse {
  data: PIPredictabilityData[];
  count: number;
}

export interface ScopeChangesDataPoint {
  'Quarter Name': string;
  'Stack Group': string;
  'Metric Name': string;
  Value: number;
}

export interface ScopeChangesResponse {
  scope_data: ScopeChangesDataPoint[];
  count: number;
  quarters: string[];
}

// Hierarchy Types
export interface HierarchyItem {
  key: string;
  parent: string | null;
  [key: string]: any; // Dynamic columns (status, type, summary, team_name, etc.)
}

export interface EpicsHierarchyResponse {
  success: boolean;
  data: {
    issues: any[];
    count: number;
    limit: number;
  };
  message: string;
}

// Flow Status Duration Types
export interface StatusDuration {
  status_name: string;
  avg_duration_days: number;
}

export interface IssueStatusDurationResponse {
  success: boolean;
  data: {
    status_durations: StatusDuration[];
    count: number;
    months: number;
  };
  message: string;
}

export interface IssueStatusDurationIssue {
  issue_key: string;
  issue_summary: string;
  duration_days: number;
}

export interface IssueStatusDurationWithKeysResponse {
  success: boolean;
  data: {
    issues: IssueStatusDurationIssue[];
    count: number;
    status_name: string;
    months: number;
  };
  message: string;
}

export interface MonthlyStatusDurationDataset {
  label: string;
  data: number[];
}

export interface IssueStatusDurationPerMonthResponse {
  success: boolean;
  data: {
    labels: string[];
    datasets: MonthlyStatusDurationDataset[];
    months: number;
    team_name: string;
  };
  message: string;
}

export interface SprintPredictabilityItem {
  sprint_name: string;
  sprint_id: string;
  sprint_official_start_date: string;
  sprint_official_end_date: string;
  avg_story_cycle_time: number;
  issues_completed_in_sprint: number;
  total_issues_in_sprint: number;
  issues_not_completed: number;
  completed_issue_keys: string[];
  total_committed_issue_keys: string[];
  issues_not_completed_keys: string[];
  sprint_predictability: number;
}

export interface SprintPredictabilityResponse {
  success: boolean;
  data: {
    sprint_predictability: SprintPredictabilityItem[];
    count: number;
    months: number;
  };
  message: string;
}

export interface ReleasePredictabilityItem {
  version_name: string;
  project_key: string;
  release_start_date: string;
  release_date: string;
  total_epics_in_scope: number;
  epics_completed: number;
  epic_percent_completed: number;
  total_other_issues_in_scope: number;
  other_issues_completed: number;
  other_issues_percent_completed: number;
}

export interface ReleasePredictabilityResponse {
  success: boolean;
  data: {
    release_predictability?: ReleasePredictabilityItem[];
    releases?: ReleasePredictabilityItem[];
    count: number;
    months: number;
  };
  message: string;
}

export interface IssueByPriority {
  priority: string;
  issue_count: number;
}

export interface IssuesByPriorityResponse {
  success: boolean;
  data: {
    issues_by_priority: IssueByPriority[];
    count: number;
  };
  message: string;
}

export interface PriorityCount {
  priority: string;
  issue_count: number;
}

export interface IssuesByTeam {
  team_name: string;
  priorities: PriorityCount[];
  total_issues: number;
}

export interface IssuesByTeamResponse {
  success: boolean;
  data: {
    issues_by_team: IssuesByTeam[];
    count: number;
  };
  message: string;
}

export interface ActiveSprintSummaryItem {
  sprint_id: number;
  sprint_name: string;
  team_name: string;
  start_date: string;
  end_date: string;
  overall_progress_pct: number;
  issues_at_start: number;
  issues_added: number;
  issues_done: number;
  flagged_issues: number;
  issues_remaining: number;
  sprint_goal: string;
  [key: string]: any; // Allow for additional fields
}

export interface ActiveSprintSummaryResponse {
  success: boolean;
  data: {
    summaries: ActiveSprintSummaryItem[];
    count: number;
    group_name?: string;
    teams_in_group?: string[];
  };
  message: string;
}






