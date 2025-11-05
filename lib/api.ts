import { 
  API_CONFIG, 
  buildBackendUrl,
  ApiResponse,
  User,
  TeamsResponse,
  PIsResponse,
  AICardsResponse,
  RecommendationsResponse,
  SprintMetrics,
  CompletionRate,
  ClosedSprintsResponse,
  IssuesTrendResponse,
  IssuesTrendDataPoint,
  PIPredictabilityResponse,
  PIPredictabilityData,
  ScopeChangesResponse,
  ScopeChangesDataPoint,
  HierarchyItem,
  EpicsHierarchyResponse,
  StatusDuration,
  IssueStatusDurationResponse,
  SprintPredictabilityItem,
  SprintPredictabilityResponse,
  ReleasePredictabilityItem,
  ReleasePredictabilityResponse,
  IssueByPriority,
  IssuesByPriorityResponse,
  IssuesByTeam,
  IssuesByTeamResponse
} from './config';
// No auth imports needed - simplified

// Re-export types for convenience
export type { IssuesTrendDataPoint, IssuesTrendResponse, PIPredictabilityResponse, PIPredictabilityData, ScopeChangesResponse, ScopeChangesDataPoint };

// Simple fetch - no authentication needed
const fetch = typeof window !== 'undefined' ? window.fetch : (globalThis as any).fetch;

export interface BurndownDataPoint {
  snapshot_date: string;
  pi_name?: string; // For PI burndown
  start_date: string;
  end_date: string;
  remaining_issues: number | null;
  ideal_remaining: number;
  total_issues: number;
  issues_added_on_day: number;
  issues_removed_on_day: number;
  issues_completed_on_day: number;
  planned_issues?: number; // For PI burndown
}

export interface BurndownResponse {
  success: boolean;
  data: {
    sprint_id?: number;
    sprint_name?: string;
    pi_name?: string;
    start_date: string;
    end_date: string;
    burndown_data: BurndownDataPoint[];
    team_name: string;
    issue_type: string;
    total_issues_in_sprint?: number;
    pi?: string;
    project?: string;
    team?: string;
  };
  message: string;
}

export interface PIBurndownResponse {
  success: boolean;
  data: {
    burndown_data: BurndownDataPoint[];
    count: number;
    pi: string;
    project?: string | null;
    issue_type?: string | null;
    team?: string | null;
  };
  message: string;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  // Teams API
  async getTeams(): Promise<TeamsResponse> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.teams.getNames));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }

    const result: ApiResponse<TeamsResponse> = await response.json();
    return result.data;
  }

  // PIs API
  async getPIs(): Promise<PIsResponse> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.pis.getPis));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PIs: ${response.statusText}`);
    }

    const result: ApiResponse<PIsResponse> = await response.json();
    return result.data;
  }

  // Burndown API
  async getBurndownData(
    teamName: string,
    issueType: string = 'all',
    sprintName?: string
  ): Promise<BurndownResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
      issue_type: issueType,
    });

    if (sprintName) {
      params.append('sprint_name', sprintName);
    }

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.burndown.sprintBurndown)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch burndown data: ${response.statusText}`);
    }

    return response.json();
  }

  // PI Burndown API
  async getPIBurndownData(
    piName: string,
    issueType?: string,
    teamName?: string,
    project?: string
  ): Promise<PIBurndownResponse> {
    const params = new URLSearchParams({
      pi: piName,
    });

    if (issueType) {
      params.append('issue_type', issueType);
    }

    if (project) {
      params.append('project', project);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.pis.getBurndown)}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PI Burndown API Error:', response.status, errorText);
      throw new Error(`Failed to fetch PI burndown data: ${response.statusText}`);
    }

    return response.json();
  }

  // AI Cards API
  async getAICards(teamName: string): Promise<AICardsResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
    });

    const response = await fetch(`${buildBackendUrl('/team-ai-cards/getTopCards')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AI cards: ${response.statusText}`);
    }

    const result: ApiResponse<AICardsResponse> = await response.json();
    return result.data;
  }

  // Recommendations API
  async getRecommendations(teamName: string): Promise<RecommendationsResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
    });

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.recommendations.getTop)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
    }

    const result: ApiResponse<RecommendationsResponse> = await response.json();
    return result.data;
  }

  // PI AI Cards API
  async getPIAICards(piName: string): Promise<AICardsResponse> {
    const params = new URLSearchParams({
      pi: piName,
    });

    const response = await fetch(`${buildBackendUrl('/pi-ai-cards/getTopCards')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PI AI cards: ${response.statusText}`);
    }

    const result: ApiResponse<AICardsResponse> = await response.json();
    return result.data;
  }

  // PI Recommendations API
  async getPIRecommendations(piName: string): Promise<RecommendationsResponse> {
    const params = new URLSearchParams({
      pi: piName,
    });

    const response = await fetch(`${buildBackendUrl('/recommendations/getPITop')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PI recommendations: ${response.statusText}`);
    }

    const result: ApiResponse<RecommendationsResponse> = await response.json();
    return result.data;
  }

  // Team Metrics APIs
  async getSprintMetrics(teamName: string): Promise<SprintMetrics> {
    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.avgSprintMetrics)}?team_name=${teamName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sprint metrics: ${response.statusText}`);
    }

    const result: ApiResponse<SprintMetrics> = await response.json();
    return result.data;
  }

  async getCompletionRate(teamName: string): Promise<CompletionRate> {
    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.currentSprintProgress)}?team_name=${teamName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch completion rate: ${response.statusText}`);
    }

    const result: ApiResponse<CompletionRate> = await response.json();
    return result.data;
  }

  async getClosedSprints(teamName: string, months: number = 3): Promise<ClosedSprintsResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
      months: months.toString(),
    });

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.closedSprints)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch closed sprints: ${response.statusText}`);
    }

    const result: ApiResponse<ClosedSprintsResponse> = await response.json();
    return result.data;
  }

  async getIssuesTrend(
    teamName: string,
    issueType: string = 'Bug',
    months: number = 6
  ): Promise<IssuesTrendResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
      issue_type: issueType,
      months: months.toString(),
    });

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.issuesTrend)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch issues trend data: ${response.statusText}`);
    }

    const result: ApiResponse<IssuesTrendResponse> = await response.json();
    return result.data;
  }

  // Scope Changes API
  async getScopeChanges(quarter: string | string[]): Promise<ScopeChangesResponse> {
    const params = new URLSearchParams();
    
    if (Array.isArray(quarter)) {
      quarter.forEach(q => params.append('quarter', q));
    } else {
      params.append('quarter', quarter);
    }

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.pis.getScopeChanges)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch scope changes data: ${response.statusText}`);
    }

    const result: ApiResponse<ScopeChangesResponse> = await response.json();
    return result.data;
  }

  // PI Predictability API
  async getPIPredictability(piNames: string | string[], teamName?: string): Promise<any> {
    const params = new URLSearchParams();
    
    if (Array.isArray(piNames)) {
      params.append('pi_names', piNames.join(','));
    } else {
      params.append('pi_names', piNames);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.pis.getPredictability)}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PI Predictability API Error:', response.status, errorText);
      throw new Error(`Failed to fetch PI predictability data: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle the actual API response structure
    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      if ('predictability_data' in result.data && Array.isArray(result.data.predictability_data)) {
        return result.data.predictability_data;
      }
    }
    
    if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else if (Array.isArray(result)) {
      return result;
    }
    
    return [];
  }

  // Users API
  async getCurrentUser(): Promise<User> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.users.getCurrentUser));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current user: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as User;
    }
    
    return result as User;
  }

  // Epics Hierarchy API
  async getEpicsHierarchy(
    pi?: string,
    teamName?: string,
    limit: number = 500
  ): Promise<HierarchyItem[]> {
    const params = new URLSearchParams();
    
    if (pi) {
      params.append('pi', pi);
    }
    
    if (teamName) {
      params.append('team_name', teamName);
    }
    
    if (limit !== 500) {
      params.append('limit', limit.toString());
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.epicsHierarchy)}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch epics hierarchy: ${response.statusText}`);
    }

    const result: EpicsHierarchyResponse = await response.json();
    
    // Transform the response to match HierarchyItem structure
    if (result.success && result.data && result.data.issues) {
      // Debug: log first item to see actual field names
      if (process.env.NODE_ENV === 'development' && result.data.issues.length > 0) {
        console.log('Sample API item (first item):', result.data.issues[0]);
        console.log('All field names in first item:', Object.keys(result.data.issues[0]));
      }
      
      const transformed = result.data.issues.map((item: any) => {
        // Try multiple possible field names for key, summary, and parent
        // The user mentioned: Key, issue_summary, and parent_key are fixed columns
        // But actual API uses: Key (capital K), "Issue Summary" (with space and capitals), and Parent (capital P)
        const key = item.Key || item.epic_key || item.key || item.issue_key || '';
        const summary = item["Issue Summary"] || item["issue_summary"] || item.epic_name || item.summary || item.name || '';
        const parent = item.Parent || item["Parent Key"] || item["parent_key"] || item.parent || null;
        
        const transformed: HierarchyItem = {
          key: key,
          parent: parent,
          summary: summary,
          // Copy all other fields as-is (excluding the mapped fields)
          ...Object.keys(item).reduce((acc, k) => {
            // Exclude the mapped fields and their variations
            const lowerK = k.toLowerCase();
            if (
              k !== 'Key' && k !== 'epic_key' && k !== 'key' && k !== 'issue_key' &&
              k !== 'Parent' && k !== 'Parent Key' && k !== 'parent_key' && k !== 'parent' &&
              k !== 'Issue Summary' && k !== 'issue_summary' && k !== 'epic_name' && k !== 'summary' && k !== 'name'
            ) {
              acc[k] = item[k];
            }
            return acc;
          }, {} as any),
        };
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development' && transformed.key === '') {
          console.warn('Empty key found! Original item:', item);
        }
        
        return transformed;
      });
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Total items:', transformed.length);
        console.log('Items with parent:', transformed.filter(i => i.parent).length);
        console.log('Items with empty key:', transformed.filter(i => !i.key || i.key === '').length);
        if (transformed.length > 0) {
          console.log('Sample transformed item:', transformed[0]);
        }
      }
      
      return transformed;
    }
    
    return [];
  }

  // Issue Status Duration API
  async getIssueStatusDuration(
    issueType?: string,
    teamName?: string
  ): Promise<StatusDuration[]> {
    const params = new URLSearchParams();
    
    if (issueType) {
      params.append('issue_type', issueType);
    }
    
    if (teamName) {
      params.append('team_name', teamName);
    }

    const endpoint = API_CONFIG.endpoints.issues.issueStatusDuration;
    const baseUrl = buildBackendUrl(endpoint);
    let url = `${baseUrl}?${params}`;
    
    // CRITICAL FIX: Ensure URL is relative and starts with /api/
    // If baseUrl is somehow empty or wrong, fix it
    if (!url.startsWith('/api/')) {
      console.error('[ApiService.getIssueStatusDuration] ❌❌❌ FIXING WRONG URL!', {
        originalUrl: url,
        baseUrl,
        endpoint,
        'API_CONFIG.baseUrl': API_CONFIG.baseUrl,
        'Expected pattern': '/api/v1/...',
        stackTrace: new Error().stack
      });
      
      // Force correct URL
      const correctBaseUrl = '/api/v1';
      url = `${correctBaseUrl}${endpoint}?${params}`;
      
      console.log('[ApiService.getIssueStatusDuration] Fixed URL:', url);
    }
    
    // Debug logging for Railway issue - first report using wrong URL
    console.log('[ApiService.getIssueStatusDuration] Debug:', {
      endpoint,
      baseUrl,
      fullUrl: url,
      'API_CONFIG.baseUrl': API_CONFIG.baseUrl,
      'API_CONFIG.version': API_CONFIG.version,
      'this.baseUrl': this.baseUrl,
      issueType,
      teamName,
      params: params.toString(),
      'NEXT_PUBLIC_BACKEND_URL': process.env.NEXT_PUBLIC_BACKEND_URL,
      'INTERNAL_BACKEND_URL': typeof process !== 'undefined' && process.env ? process.env.INTERNAL_BACKEND_URL : 'N/A',
      'url.startsWith(/)': url.startsWith('/'),
      'url.startsWith(http)': url.startsWith('http'),
      'url.startsWith(/api/)': url.startsWith('/api/'),
      timestamp: new Date().toISOString()
    });
    
    console.log('[ApiService.getIssueStatusDuration] About to fetch:', url);
    const response = await fetch(url);
    console.log('[ApiService.getIssueStatusDuration] Fetch completed, status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch issue status duration: ${response.statusText}`);
    }

    const result: IssueStatusDurationResponse = await response.json();
    
    if (result.success && result.data && result.data.status_durations) {
      return result.data.status_durations;
    }
    
    return [];
  }

  // Sprint Predictability API
  async getSprintPredictability(months: number = 3): Promise<SprintPredictabilityItem[]> {
    const params = new URLSearchParams();
    params.append('months', months.toString());
    
    const url = `${buildBackendUrl(API_CONFIG.endpoints.sprints.sprintPredictability)}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sprint predictability: ${response.statusText}`);
    }

    const result: SprintPredictabilityResponse = await response.json();
    
    if (result.success && result.data && result.data.sprint_predictability) {
      return result.data.sprint_predictability;
    }
    
    return [];
  }

  // Release Predictability API
  async getReleasePredictability(months: number = 3): Promise<ReleasePredictabilityItem[]> {
    const params = new URLSearchParams();
    params.append('months', months.toString());
    
    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.releasePredictability)}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch release predictability: ${response.statusText}`);
    }

    const result: ReleasePredictabilityResponse = await response.json();
    
    if (result.success && result.data && result.data.release_predictability) {
      return result.data.release_predictability;
    }
    
    return [];
  }

  // Issues Grouped by Priority API
  async getIssuesByPriority(issueType: string, teamName?: string): Promise<IssueByPriority[]> {
    const params = new URLSearchParams();
    params.append('issue_type', issueType);
    
    if (teamName) {
      params.append('team_name', teamName);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.issuesGroupedByPriority)}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch issues by priority: ${response.statusText}`);
    }

    const result: IssuesByPriorityResponse = await response.json();
    
    if (result.success && result.data && result.data.issues_by_priority) {
      return result.data.issues_by_priority;
    }
    
    return [];
  }

  // Issues Grouped by Team API
  async getIssuesByTeam(issueType: string): Promise<IssuesByTeam[]> {
    const params = new URLSearchParams();
    params.append('issue_type', issueType);

    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.issuesGroupedByTeam)}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch issues by team: ${response.statusText}`);
    }

    const result: IssuesByTeamResponse = await response.json();
    
    if (result.success && result.data && result.data.issues_by_team) {
      return result.data.issues_by_team;
    }
    
    return [];
  }
}

// Legacy class for backward compatibility
export class BurndownApiService {
  private apiService: ApiService;

  constructor(baseUrl?: string) {
    this.apiService = new ApiService();
  }

  async getBurndownData(
    teamName: string,
    issueType: string = 'all',
    sprintName?: string
  ): Promise<BurndownResponse> {
    return this.apiService.getBurndownData(teamName, issueType, sprintName);
  }
}




