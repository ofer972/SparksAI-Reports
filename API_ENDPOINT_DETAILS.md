# Issue Status Duration Endpoint - Request/Response Details

## Endpoint Details

**Endpoint:** `GET /api/v1/issues/issue-status-duration`

**Full URL (when using buildBackendUrl):**
- Production: `/api/v1/issues/issue-status-duration`
- Localhost (bypass mode): `http://localhost:8000/api/v1/issues/issue-status-duration`

## Current Implementation - What We're Sending

**HTTP Method:** GET

**Query Parameters:**
- `issue_type` (optional) - String, e.g., "Bug", "Story", "Epic"
- `team_name` (optional) - String, e.g., "Team Alpha", "SOC-App"

**Example Requests:**
1. No filters: `GET /api/v1/issues/issue-status-duration`
2. With issue_type: `GET /api/v1/issues/issue-status-duration?issue_type=Bug`
3. With team_name: `GET /api/v1/issues/issue-status-duration?team_name=Team%20Alpha`
4. With both: `GET /api/v1/issues/issue-status-duration?issue_type=Bug&team_name=Team%20Alpha`

**Headers:**
- Authorization header (if not on localhost)
- Content-Type: application/json (implicit)

## Expected Response Format

```json
{
  "success": true,
  "data": {
    "status_durations": [
      {
        "status_name": "Code Review",
        "avg_duration_days": 2.5
      },
      {
        "status_name": "In Development",
        "avg_duration_days": 5.3
      }
    ],
    "count": 2,
    "months": 3
  },
  "message": "Retrieved 2 status duration records (last 3 months)"
}
```

## Questions for Backend Team

1. **Is the endpoint path correct?** 
   - Current: `/api/v1/issues/issue-status-duration`
   - Is it maybe `/api/v1/issues/status-duration` or something else?

2. **Are the query parameter names correct?**
   - Current: `issue_type` and `team_name`
   - Should they be different? (e.g., `issueType`, `teamName`, etc.)

3. **Are there any required parameters?**
   - Currently we're treating both as optional
   - Should we always send something?

4. **What does the 404 mean?**
   - Is the endpoint not implemented yet?
   - Is the path wrong?
   - Are there missing required parameters?

## What We're Currently Doing

```typescript
// In lib/api.ts
async getIssueStatusDuration(issueType?: string, teamName?: string) {
  const params = new URLSearchParams();
  if (issueType) params.append('issue_type', issueType);
  if (teamName) params.append('team_name', teamName);
  
  const url = `${buildBackendUrl('/issues/issue-status-duration')}?${params}`;
  // Results in: /api/v1/issues/issue-status-duration?issue_type=X&team_name=Y
}
```

