# Implementation Plan: Create Agent Jobs Feature

## Overview
Create a new sidebar option "Create Agent Jobs" that displays active insight types in individual card containers. Each card contains the required filters (PI/Team) and a create job button.

## UI Summary

### Layout Structure
- **Page Header**: "Create Agent Jobs" title
- **Card Grid Layout**: Each insight type displayed in its own card/container
- **Card Design**: 
  - White background with border and shadow (matching existing card styles)
  - Clear separation between cards with spacing
  - Each card contains:
    - **Card Header**: Insight Type Name (bold, prominent)
    - **Filter Section**: 
      - PI Dropdown (if `requirePI === true`)
      - Team Dropdown (if `requireTeam === true`)
      - Both dropdowns shown side-by-side when both are required
    - **Action Section**: Create Job button (bottom of card)
    - **Loading State**: Spinner/disabled state on button while creating job

### Visual Example
```
┌─────────────────────────────────────────┐
│  Create Agent Jobs                      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Insight Type: Sprint Analysis     │ │
│  │                                   │ │
│  │  [PI Dropdown ▼]  [Team Dropdown ▼]│ │
│  │                                   │ │
│  │  [Create Job]                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Insight Type: Release Metrics     │ │
│  │                                   │ │
│  │  [PI Dropdown ▼]                  │ │
│  │                                   │ │
│  │  [Create Job]                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Insight Type: Team Performance    │ │
│  │                                   │ │
│  │  [Team Dropdown ▼]                │ │
│  │                                   │ │
│  │  [Create Job]                     │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Responsive Design
- **Desktop**: 2-3 cards per row in a grid
- **Tablet**: 2 cards per row
- **Mobile**: 1 card per row (stacked vertically)

## Requirements Summary
1. New sidebar navigation item: "Create Agent Jobs"
2. Fetch active insight types from `GET /api/v1/insight-types?active=true`
3. Display each insight type in its own card container with clear separation
4. For each insight type:
   - Show PI dropdown if `requirePI === true`
   - Show Team dropdown if `requireTeam === true`
   - Show both dropdowns side-by-side if both are required
   - "Create Job" button at the bottom of each card
5. Validation: Ensure required fields are selected before enabling create button
6. Three separate endpoints based on requirements:
   - `/api/v1/agent-jobs/create-pi-job-for-team` - when both PI and Team are required
   - `/api/v1/agent-jobs/create-team-job` - when only Team is required
   - `/api/v1/agent-jobs/create-pi-job` - when only PI is required
7. Notifications:
   - Success: Toast notification - "Agent job created" (auto-dismiss)
   - Error: Popup/Modal message - Display error message from API (user must close)

## Implementation Steps

### Step 1: Add Insight Types API Endpoint Configuration
**File**: `lib/config.ts`
- Add endpoint for insight types: `/insight-types`
- Add type definitions:
  ```typescript
  export interface InsightType {
    id: string | number;
    name: string;
    requirePI: boolean;
    requireTeam: boolean;
    active?: boolean;
    // ... other fields from API response
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
  ```

### Step 2: Add API Methods
**File**: `lib/api.ts`
- Add method `getActiveInsightTypes()`:
  ```typescript
  async getActiveInsightTypes(): Promise<InsightTypesResponse> {
    const response = await fetch(
      `${buildBackendUrl('/insight-types')}?active=true`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch insight types: ${response.statusText}`);
    }
    const result: ApiResponse<InsightTypesResponse> = await response.json();
    return result.data;
  }
  ```

- Add three separate create job methods:
  ```typescript
  // When both PI and Team are required
  async createPIJobForTeam(
    insightType: string | number, 
    pi: string, 
    teamName: string // Note: team_name in API
  ): Promise<CreateJobResponse> {
    const response = await fetch(
      buildBackendUrl('/agent-jobs/create-pi-job-for-team'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight_type: insightType,
          pi: pi,
          team_name: teamName
        })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to create job');
    }
    return response.json();
  }

  // When only Team is required
  async createTeamJob(
    insightType: string | number, 
    teamName: string // Note: team_name in API
  ): Promise<CreateJobResponse> {
    const response = await fetch(
      buildBackendUrl('/agent-jobs/create-team-job'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight_type: insightType,
          team_name: teamName
        })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to create job');
    }
    return response.json();
  }

  // When only PI is required
  async createPIJob(
    insightType: string | number, 
    pi: string
  ): Promise<CreateJobResponse> {
    const response = await fetch(
      buildBackendUrl('/agent-jobs/create-pi-job'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight_type: insightType,
          pi: pi
        })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to create job');
    }
    return response.json();
  }
  ```

### Step 3: Create Toast and Error Popup Components
**File**: `components/Toast.tsx` (new file)
- Simple toast notification component for SUCCESS only
- Props: `message`, `onClose`
- Auto-dismiss after 4 seconds
- Positioned at top-center or top-right
- Styled with Tailwind CSS:
  - Green background with checkmark icon
- Slide-in animation from top

**File**: `components/ErrorModal.tsx` (new file)
- Modal/popup component for ERROR messages
- Props: `message`, `onClose`
- Centered modal overlay
- Styled with Tailwind CSS:
  - Red border/header
  - Close button
  - Backdrop overlay

### Step 4: Create Create Agent Jobs Page Component
**File**: `components/create-agent-jobs/CreateAgentJobsPage.tsx` (new file)

**Component Structure:**
```typescript
export default function CreateAgentJobsPage() {
  const apiService = new ApiService();
  
  // State
  const [insightTypes, setInsightTypes] = useState<InsightType[]>([]);
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [selectedPI, setSelectedPI] = useState<Record<string | number, string>>({});
  const [selectedTeam, setSelectedTeam] = useState<Record<string | number, string>>({});
  const [loading, setLoading] = useState<Record<string | number, boolean>>({});
  const [toast, setToast] = useState<string | null>(null); // Only for success
  const [errorModal, setErrorModal] = useState<string | null>(null); // For errors
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch available PIs for dropdown
  const fetchPIs = async () => {
    try {
      const pisResponse = await apiService.getPIs();
      // Extract pi_name from each PI object
      const piNames = pisResponse.pis.map(pi => pi.pi_name);
      setAvailablePIs(piNames);
    } catch (err) {
      console.error('Failed to fetch PIs:', err);
      // Don't block the page if PIs fail to load
    }
  };

  // Fetch available Teams for dropdown
  const fetchTeams = async () => {
    try {
      const teamsResponse = await apiService.getTeams();
      // Teams response contains teams: string[] (team names directly)
      setAvailableTeams(teamsResponse.teams);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      // Don't block the page if teams fail to load
    }
  };

  // Fetch active insight types
  const fetchInsightTypes = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const response = await apiService.getActiveInsightTypes();
      setInsightTypes(response.insight_types);
    } catch (err) {
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
      if (insightType.requirePI && insightType.requireTeam) {
        // Use team_name in the request
        response = await apiService.createPIJobForTeam(
          insightType.id,
          selectedPI[insightType.id],
          selectedTeam[insightType.id] // This is team_name
        );
      } else if (insightType.requireTeam) {
        response = await apiService.createTeamJob(
          insightType.id,
          selectedTeam[insightType.id] // This is team_name
        );
      } else if (insightType.requirePI) {
        response = await apiService.createPIJob(
          insightType.id,
          selectedPI[insightType.id]
        );
      }

      if (response?.success) {
        setToast('Agent job created');
        // Optionally clear selections after success
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
  const renderInsightTypeCard = (insightType: InsightType) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {insightType.name}
      </h3>
      
      <div className="space-y-3 mb-4">
        {insightType.requirePI && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PI
            </label>
            <select
              value={selectedPI[insightType.id] || ''}
              onChange={(e) => setSelectedPI(prev => ({
                ...prev,
                [insightType.id]: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select PI</option>
              {availablePIs.map(pi => (
                <option key={pi} value={pi}>{pi}</option>
              ))}
            </select>
          </div>
        )}
        
        {insightType.requireTeam && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team
            </label>
            <select
              value={selectedTeam[insightType.id] || ''}
              onChange={(e) => setSelectedTeam(prev => ({
                ...prev,
                [insightType.id]: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Team</option>
              {availableTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={() => handleCreateJob(insightType)}
        disabled={
          loading[insightType.id] ||
          (insightType.requirePI && !selectedPI[insightType.id]) ||
          (insightType.requireTeam && !selectedTeam[insightType.id])
        }
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading[insightType.id] ? 'Creating...' : 'Create Job'}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Create Agent Jobs</h1>
      
      {fetching && <div>Loading insight types...</div>}
      {error && <div className="text-red-600">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insightTypes.map(renderInsightTypeCard)}
      </div>

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
```

### Step 5: Add Sidebar Navigation Item
**File**: `app/page.tsx`
- Add new navigation item to `navigationItems` array:
  ```typescript
  { id: 'create-agent-jobs', label: 'Create Agent Jobs', icon: '⚙️' }
  ```
- Add case in `renderMainContent()` switch statement:
  ```typescript
  case 'create-agent-jobs':
    return <CreateAgentJobsPage />;
  ```
- Import `CreateAgentJobsPage` component at the top

## Dropdown Population Details

### How PIs are Populated
1. Call `apiService.getPIs()` which returns `PIsResponse`
2. Structure: `{ pis: PI[], count: number }`
3. Each `PI` object has a `pi_name` field
4. Extract: `const piNames = pisResponse.pis.map(pi => pi.pi_name)`
5. Populate dropdown with `piNames` array

### How Teams are Populated
1. Call `apiService.getTeams()` which returns `TeamsResponse`
2. Structure: `{ teams: string[], count: number }`
3. The `teams` array contains team names directly (these are `team_name` values)
4. Use `teamsResponse.teams` directly for dropdown
5. **Important**: When sending to API, use `team_name` field in request body

### Example Code
```typescript
// Fetch PIs
const pisResponse = await apiService.getPIs();
const piNames = pisResponse.pis.map(pi => pi.pi_name);
setAvailablePIs(piNames);

// Fetch Teams
const teamsResponse = await apiService.getTeams();
setAvailableTeams(teamsResponse.teams); // Already team_name strings
```

## Technical Details

### API Endpoints Structure
```
GET /api/v1/insight-types?active=true
Response: {
  success: true,
  data: {
    insight_types: [
      {
        id: 1,
        name: "Sprint Analysis",
        requirePI: true,
        requireTeam: true,
        active: true
      },
      ...
    ],
    count: 10
  },
  message: "Retrieved 10 insight types"
}

POST /api/v1/agent-jobs/create-pi-job-for-team
Body: { insight_type: string | number, pi: string, team_name: string }

POST /api/v1/agent-jobs/create-team-job
Body: { insight_type: string | number, team_name: string }

POST /api/v1/agent-jobs/create-pi-job
Body: { insight_type: string | number, pi: string }
```

### Endpoint Selection Logic
```typescript
const determineEndpoint = (insightType: InsightType) => {
  if (insightType.requirePI && insightType.requireTeam) {
    return 'create-pi-job-for-team';
  } else if (insightType.requireTeam) {
    return 'create-team-job';
  } else if (insightType.requirePI) {
    return 'create-pi-job';
  }
  // Edge case: neither required (shouldn't happen, but handle gracefully)
  return null;
};
```

### Validation Logic
```typescript
const canCreateJob = (insightType: InsightType) => {
  if (insightType.requirePI && !selectedPI[insightType.id]) return false;
  if (insightType.requireTeam && !selectedTeam[insightType.id]) return false;
  return true;
};
```

## Files to Create/Modify

### New Files
1. `components/create-agent-jobs/CreateAgentJobsPage.tsx`
2. `components/Toast.tsx` (for success messages only)
3. `components/ErrorModal.tsx` (for error popup)

### Modified Files
1. `app/page.tsx` - Add navigation item and route
2. `lib/config.ts` - Add type definitions and endpoint config
3. `lib/api.ts` - Add API methods for insight types and create jobs

## Styling Details

### Card Styling
- White background: `bg-white`
- Border: `border border-gray-200`
- Shadow: `shadow-sm`
- Rounded corners: `rounded-lg`
- Padding: `p-4`
- Spacing between cards: `gap-4` in grid

### Dropdown Styling
- Match existing select component styles
- Full width within card
- Standard border and focus states

### Button Styling
- Primary blue: `bg-blue-600 hover:bg-blue-700`
- Disabled state: `bg-gray-400`
- Full width within card
- Loading state shows "Creating..." text

## Testing Considerations
- Test with insight types that require:
  - Only PI
  - Only Team
  - Both PI and Team
- Test validation (button disabled when required fields missing)
- Test success/error toast notifications
- Test loading states (button disabled during API call)
- Test empty states (no active insight types)
- Test responsive layout (mobile, tablet, desktop)

## Dependencies
- No new npm packages required
- Uses existing:
  - Tailwind CSS
  - Next.js 14
  - React 18

## Notes
- Each insight type is completely independent (separate state per card)
- Clear visual separation between cards
- Toast notifications (success only) appear at top-center or top-right
- Error popup/modal appears centered and requires user to close
- **Dropdown Population**:
  - **PIs**: Fetched via `apiService.getPIs()` → extract `pi_name` from each PI object
  - **Teams**: Fetched via `apiService.getTeams()` → returns `teams: string[]` directly (these are team_name values)
- **API Request Bodies**: Use `team_name` field (not `team`) when sending to backend
- Follow existing code patterns for consistency
- Error handling matches existing patterns in the codebase
