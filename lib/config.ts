// API Configuration
// Helper to detect if we should bypass auth/gateway (localhost or when BYPASS_AUTH is enabled)
const shouldBypassGateway = () => {
  if (typeof window === 'undefined') return false; // Server-side: no bypass
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  const bypassAuthEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  return isLocalhost || bypassAuthEnabled;
};

// Get base URL dynamically (handles localhost bypass)
const getBaseUrl = () => {
  if (shouldBypassGateway()) {
    // Only use localhost if we're actually on localhost
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1');
    
    if (isLocalhost) {
      return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    }
    // In production with BYPASS_AUTH, use API_BASE_URL (should be /api for rewrites)
    return process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
};

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
  get baseUrl() {
    return getBaseUrl();
  },
  version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  
  endpoints: {
    // Team endpoints
    teams: {
      getNames: '/teams/getNames',
    },
    
    // PI endpoints
    pis: {
      getPis: '/pis/getPis',
      getPredictability: '/pis/predictability',
      getBurndown: '/pis/burndown',
      getScopeChanges: '/pis/scope-changes',
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
      releasePredictability: '/issues/release-predictability',
      issuesGroupedByPriority: '/issues/issues-grouped-by-priority',
      issuesGroupedByTeam: '/issues/issues-grouped-by-team',
    },
    
    // Sprints endpoints
    sprints: {
      sprintPredictability: '/sprints/sprint-predictability',
    },
    
  },
} as const;

/**
 * Build URL for USER SERVICE / USER ENDPOINTS
 * These endpoints are handled by the gateway service at /api/* (NOT /api/v1/*)
 * Use for: /users/*, /roles, /allowlist, /login, /register, /auth/*, /oauth/*
 * 
 * @param endpoint - Resource path (will be prefixed with /api)
 * @returns Full URL: /api/{endpoint}
 * 
 * @example
 * buildUserServiceUrl('/users/verify-admin') → '/api/users/verify-admin'
 * buildUserServiceUrl('/roles') → '/api/roles'
 */
export const buildUserServiceUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;  // /api/users/verify-admin (no /v1)
};

/**
 * Build URL for BACKEND v1 API endpoints
 * Backend endpoints are proxied to backend services at /api/v1/* 
 * All endpoints in API_CONFIG.endpoints.* should use this.
 * Use for: teams, pis, transcripts, agent-jobs, team-ai-cards, settings, etc.
 * 
 * @param endpoint - Resource path (will be prefixed with /api/v1)
 * @returns Full URL: /api/v1/{endpoint}
 * 
 * @example
 * buildBackendUrl('/teams/getNames') → '/api/v1/teams/getNames'
 * buildBackendUrl(API_CONFIG.endpoints.teams.getNames) → '/api/v1/teams/getNames'
 */
export const buildBackendUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.baseUrl;
  const version = API_CONFIG.version;
  
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Build versioned path: /v1/teams/getNames
  const versionedPath = `/${version}${cleanEndpoint}`;
  
  // Check if we're actually on localhost (not just BYPASS_AUTH enabled)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');
  
  if (shouldBypassGateway() && isLocalhost) {
    // Bypass mode (direct backend on localhost): add /api prefix to full URL
    // Result: http://localhost:8000/api/v1/teams/getNames
    return `${baseUrl}/api${versionedPath}`;
  } else {
    // Gateway mode or BYPASS_AUTH on production: use Next.js rewrite
    // Next.js rewrite will send /api/v1/... to backend/api/v1/...
    // Result: /api/v1/teams/getNames
    return `${baseUrl}${versionedPath}`;
  }
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

export interface SprintPredictabilityItem {
  sprint_name: string;
  sprint_predictability: number;
  avg_story_cycle_time: number;
  sprint_official_start_date: string;
  sprint_official_end_date: string;
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


