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
      getTopDependenciesSummary: '/pis/top-dependencies-summary',
      getAverageEpicCycleTime: '/pis/average-epic-cycle-time',
    },

    // Burndown endpoints
    burndown: {
      sprintBurndown: '/team-metrics/sprint-burndown',
    },

    // AI Cards endpoints
    aiCards: {
      getCards: '/team-ai-cards/getCards',
    },

    // PI AI Cards endpoints
    piAICards: {
      getAllFields: '/pi-ai-cards/getAllFields',
    },

    // Recommendations endpoints
    recommendations: {
      getTop: '/recommendations/getTeamTop',
      getCollection: '/recommendations/collection',
    },

    // Team Metrics endpoints
    teamMetrics: {
      avgSprintMetrics: '/team-metrics/get-avg-sprint-metrics',
      currentSprintProgress: '/team-metrics/current-sprint-progress',
      closedSprints: '/team-metrics/closed-sprints',
      sprintVelocityAdvanced: '/team-metrics/sprint-velocity-advanced',
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

    // Insight Types endpoints
    insightTypes: {
      getAll: '/insight-types',
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
      issueTypesHierarchy: '/issues/issue-types-hierarchy',
      releasePredictability: '/issues/release-predictability',
      issuesGroupedByTeam: '/issues/issues-grouped-by-team',
      epicOutboundDependencyLoadByQuarter: '/issues/epic-outbound-dependency-metrics-by-quarter',
      epicInboundDependencyLoadByQuarter: '/issues/epic-inbound-dependency-load-by-quarter',
      cycleTimeWithIssueKeys: '/issues/cycle-time-with-issues-keys',
    },

    // Sprints endpoints
    sprints: {
      sprintPredictability: '/sprints/sprint-predictability',
    },

    // Reports endpoints
    reports: {
      // Generic report endpoints (report_id will be part of the path)
      issuesHierarchy: '/reports/issues-epics-hierarchy',
      activeSprintSummary: '/reports/active-sprint-summary',
      wipOverTime: '/reports/wip-over-time',
      cycleTime: '/reports/cycle-time-over-time',
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

export interface TeamAICard {
  id: number;
  date: string;
  team_name: string;
  group_name?: string | null;
  card_name: string;
  card_type: string;
  priority: string;
  source: string;
  source_job_id?: number | null;
  description: string;
  full_information: string;
  information_json?: string | null;
  pi?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeamAICardsResponse {
  cards: TeamAICard[];
  count: number;
}

export interface PIAICard {
  id: number;
  date: string;
  pi_name: string;
  card_name: string;
  card_type: string;
  priority: string;
  source: string;
  source_job_id?: number | null;
  description: string;
  full_information: string;
  information_json?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PIAICardsResponse {
  cards: PIAICard[];
  count: number;
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
  information_json?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecommendationsCollectionResponse {
  recommendations: Recommendation[];
  count: number;
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
  team_name: string;
  sprint_goal: string;
  start_date: string;
  complete_date: string;
  issues_at_start: number;
  issues_added: number;
  issues_removed: number;
  issues_done: number;
  issues_not_completed: number;
  completed_percentage: number;
  issues_at_start_keys: string[];
  issues_added_keys: string[];
  issues_removed_keys: string[];
  completed_issue_keys: string[];
  issues_not_completed_keys: string[];
}

export interface ClosedSprintsResponse {
  months: number;
  closed_sprints_by_team: {
    [teamName: string]: ClosedSprint[];
  };
  total_sprints: number;
  teams_count: number;
  team_name: string;
}

export interface SprintVelocityAdvancedResponse {
  data: ClosedSprint[];
  meta: {
    months: number;
    total_sprints: number;
    teams_count: number;
    average_velocity: number;
    team_name?: string;
    group_name?: string;
    teams_in_group?: string[];
  };
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
  'Issue Keys'?: string | string[];
  issue_keys?: string | string[];
  issueKeys?: string | string[];
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

export interface IssueTypesHierarchyResponse {
  success: boolean;
  data: {
    levels: Array<{
      hierarchyLevel: number;
      issue_types: string[];
    }>;
    count: number;
  };
  message: string;
}

export interface EpicsHierarchyResponse {
  success: boolean;
  data: {
    // New reports endpoint structure: data.result.issues / count / limit
    result?: {
      issues: any[];
      count: number;
      limit: number;
      [key: string]: any;
    };
    // Backwards compatibility with legacy structure: data.issues / count / limit
    issues?: any[];
    count?: number;
    limit?: number;
    // Additional metadata fields (definition, filters, meta, etc.)
    [key: string]: any;
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
  // Can be null when backend cannot calculate progress yet
  overall_progress_pct: number | null;
  // Controls the color of overall_progress_pct (red, yellow, green or null)
  overall_progress_pct_color: 'green' | 'yellow' | 'red' | null;
  issues_at_start: number;
  issues_at_start_keys: string[];
  issues_added: number;
  issues_added_keys: string[];
  // Optional color for issues_added column
  issues_added_color?: 'red' | 'yellow' | 'default';
  // New total issue counts for status categories
  total_issues_to_do: number;
  total_issues_in_progress: number;
  total_issues_done: number;
  // Keys for issues that were done in the sprint
  issues_done_keys: string[];
  flagged_issues: number;
  // Backend may return null when there are no flagged issues
  flagged_issues_keys: string[] | null;
  issues_remaining: number;
  issues_remaining_keys: string[];
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
  // Some backends always return this, but make it optional for safety
  message?: string;
}

// WIP Over Time types
export interface WIPOverTimeDataPoint {
  snapshot_day: string;
  issuetype: string;
  work_in_progress: number;
  [key: string]: string | number; // Index signature for TimeSeriesDataPoint compatibility
}

export interface WIPOverTimeResponse {
  success: boolean;
  data: {
    definition?: {
      report_id: string;
      report_name: string;
      chart_type: string;
      description: string;
      data_source: string;
      default_filters?: {
        months: number;
        isGroup: boolean;
        team_name: string | null;
      };
      meta_schema?: any;
    };
    filters?: {
      months: number;
      isGroup: boolean;
      team_name: string | null;
      bypass_cache?: string;
    };
    result: WIPOverTimeDataPoint[];
    meta?: {
      months: number;
      days_back: number;
      isGroup: boolean;
      count: number;
      available_teams?: string[];
      available_issue_types?: string[];
      team_name: string | null;
    };
  };
  message?: string;
  cached?: boolean;
}

// Cycle Time types
export interface CycleTimeDataPoint {
  snapshot_day: string;
  issuetype: string;
  avg_cycle_time: number;
  issue_count: number;
  [key: string]: string | number; // Index signature for TimeSeriesDataPoint compatibility
}

export interface CycleTimeResponse {
  success: boolean;
  data: {
    definition?: {
      report_id: string;
      report_name: string;
      chart_type: string;
      description: string;
      data_source: string;
      default_filters?: {
        months: number;
        isGroup: boolean;
        team_name: string | null;
      };
      meta_schema?: any;
    };
    filters?: {
      months: number;
      isGroup: boolean;
      team_name: string | null;
      bypass_cache?: string;
    };
    result: CycleTimeDataPoint[];
    meta?: {
      months: number;
      days_back: number;
      isGroup: boolean;
      count: number;
      available_teams?: string[];
      available_issue_types?: string[];
      team_name: string | null;
    };
  };
  message?: string;
  cached?: boolean;
}

// Cycle Time Issues types
export interface CycleTimeIssue {
  issue_key: string;
  summary: string;
  cycle_time: number;
  resolved_at: string;
  issue_type: string;
  team_name: string;
}

export interface CycleTimeIssuesResponse {
  success: boolean;
  data: {
    issues: CycleTimeIssue[];
  };
  message?: string;
}

// Insight Types and Agent Jobs
export interface InsightType {
  id: string | number;
  name: string;
  requirePI: boolean;
  requireTeam: boolean;
  requireGroup?: boolean;
  active?: boolean;
  [key: string]: any; // Allow for additional fields from API
}

export interface InsightTypesResponse {
  insight_types: InsightType[];
  count: number;
}

export interface CreateJobResponse {
  success: boolean;
  data?: any;
  message: string;
}

export interface TopInboundDependency {
  assignee_team: string;
  volume_of_work_relied_upon: number;
  completed_issues_dependent_count: number;
  uncompleted_issues: number;
}

export interface TopOutboundDependency {
  owned_team: string;
  number_of_epics_owned: number;
  number_of_dependent_issues: number;
  completed_dependent_issues_count: number;
  uncompleted_issues: number;
}

export interface TopDependenciesSummaryResponse {
  success: boolean;
  data: {
    top_inbound_dependencies: TopInboundDependency[];
    top_outbound_dependencies: TopOutboundDependency[];
    pi: string;
    count: {
      inbound: number;
      outbound: number;
    };
  };
  message: string;
}

export interface AverageEpicCycleTimeResponse {
  success: boolean;
  data: {
    average_epic_cycle_time: number;
    average_epic_cycle_time_status: 'red' | 'yellow' | 'green';
    months: number;
    epic_count: number;
    team_name: string | null;
  };
  message: string;
}





