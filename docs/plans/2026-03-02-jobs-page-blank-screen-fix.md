# Jobs Page Blank Screen Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Jobs page rendering a blank screen by correcting the API response shape mismatch between the backend and the `useJobs()` hook.

**Architecture:** The backend `GET /api/apex-jobs` returns `{ projects: ApexJob[], stats: JobStats, syncedAt: string }`, but the `useJobs()` hook treats the response as a raw `ApexJob[]`. The hook needs to unwrap `.projects` from the response. A global React error boundary will also be added to prevent blank screens from unhandled render errors in the future.

**Tech Stack:** React 19, TanStack Query, TypeScript

---

## Root Cause Analysis

1. **Backend response** (`backend/src/routes/apexJobs.js:135-139`):
   ```js
   res.json({
     projects: merged,    // ApexJob[]
     stats: stats,        // { active, pending_insurance, complete, archived, total }
     syncedAt: zohoData.syncedAt || new Date().toISOString()
   });
   ```

2. **Frontend hook** (`frontend-next/src/api/hooks/useJobs.ts:39-44`):
   ```ts
   export function useJobs() {
     return useQuery({
       queryKey: jobKeys.list(),
       queryFn: () => apiClient.get<ApexJob[]>('/apex-jobs'), // expects array, gets object
     })
   }
   ```

3. **JobsPage** (`frontend-next/src/pages/JobsPage.tsx:10`):
   ```ts
   const { data: jobs = [], isLoading, refetch } = useJobs()
   // data is { projects: [...], stats: {...} }, not undefined, so default [] doesn't apply
   // jobs is now { projects: [...], stats: {...} } — an object, not an array
   ```

4. **JobListView** (`frontend-next/src/pages/jobs/components/list/JobListView.tsx:29-35`):
   ```ts
   const filteredJobs = useMemo(() => {
     return jobs.filter(...)  // TypeError: jobs.filter is not a function
   }, [jobs, statusFilter, lossTypeFilter])
   ```

5. **No error boundary** → React crashes the entire tree → blank screen (black in dark mode, white in light mode).

---

### Task 1: Add response types and fix the `useJobs()` hook

**Files:**
- Modify: `frontend-next/src/types/job.ts` (add `JobsListResponse` and `JobStats` types)
- Modify: `frontend-next/src/api/hooks/useJobs.ts:39-44` (unwrap `.projects` via `select`)

**Step 1: Add response types to `frontend-next/src/types/job.ts`**

Add these types at the end of the file, before the `CreateApexJobData` type (before line 285):

```ts
export interface JobStats {
  active: number
  pending_insurance: number
  complete: number
  archived: number
  total: number
}

export interface JobsListResponse {
  projects: ApexJob[]
  stats: JobStats
  syncedAt: string
}
```

**Step 2: Export new types from `frontend-next/src/types/index.ts`**

Verify that `frontend-next/src/types/index.ts` re-exports from `./job.js`. If `JobStats` and `JobsListResponse` are defined in `job.ts`, they'll be available automatically via `export * from './job.js'`. No change needed if using wildcard re-export. If using named re-exports, add `JobStats` and `JobsListResponse`.

**Step 3: Fix `useJobs()` hook in `frontend-next/src/api/hooks/useJobs.ts`**

Change lines 39-44 from:
```ts
export function useJobs() {
  return useQuery({
    queryKey: jobKeys.list(),
    queryFn: () => apiClient.get<ApexJob[]>('/apex-jobs'),
  })
}
```

To:
```ts
export function useJobs() {
  return useQuery({
    queryKey: jobKeys.list(),
    queryFn: () => apiClient.get<JobsListResponse>('/apex-jobs'),
    select: (data) => data.projects,
  })
}
```

This uses TanStack Query's `select` option to transform the response. The query cache stores the full response, but consumers receive only the `ApexJob[]` array.

Also add the import at the top of the file — update the existing type import line:
```ts
import type {
  ApexJob,
  // ... existing imports ...
  JobsListResponse,
} from '@/types/index.js'
```

**Step 4: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 5: Verify in browser**

1. Open `http://localhost:5174/jobs`
2. Confirm: Jobs list renders (kanban view by default)
3. Console should have NO `TypeError: jobs.filter is not a function`

**Step 6: Commit**

```bash
git add frontend-next/src/types/job.ts frontend-next/src/api/hooks/useJobs.ts frontend-next/src/types/index.ts
git commit -m "fix(jobs): unwrap API response in useJobs hook

GET /api/apex-jobs returns { projects, stats, syncedAt } but the hook
expected a raw ApexJob[]. Use TanStack Query select to extract .projects."
```

---

### Task 2: Add a global error boundary to prevent blank screens

**Files:**
- Create: `frontend-next/src/components/ErrorBoundary.tsx`
- Modify: `frontend-next/src/App.tsx` (wrap routes in ErrorBoundary)

**Step 1: Create `frontend-next/src/components/ErrorBoundary.tsx`**

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-bg-app gap-4">
          <h1 className="text-lg font-heading text-text-primary">Something went wrong</h1>
          <p className="text-sm text-text-secondary max-w-md text-center">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:opacity-90"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Step 2: Wrap routes in `frontend-next/src/App.tsx`**

Change from:
```tsx
import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from '@/router'
import { useAuth } from '@/hooks/useAuth'

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return useRoutes(routes)
}
```

To:
```tsx
import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from '@/router'
import { useAuth } from '@/hooks/useAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary.js'

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <ErrorBoundary>
      {useRoutes(routes)}
    </ErrorBoundary>
  )
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend-next/src/components/ErrorBoundary.tsx frontend-next/src/App.tsx
git commit -m "feat: add global error boundary to prevent blank screens

Catches unhandled render errors and shows a recovery UI instead of
crashing to a blank page."
```

---

### Task 3: Verify the full fix end-to-end

**Step 1: Load the Jobs page**

1. Navigate to `http://localhost:5174/jobs`
2. Confirm: Jobs list renders with kanban view
3. Confirm: No console errors

**Step 2: Test view switching**

1. Click the List view icon → table renders
2. Click the Grid view icon → card grid renders
3. Click Kanban → kanban renders

**Step 3: Test filters**

1. Use status filter dropdown → jobs filter correctly
2. Use loss type filter dropdown → jobs filter correctly

**Step 4: Test empty state**

1. If no jobs exist, confirm the page still renders (empty kanban columns, empty table, etc.)

**Step 5: Test navigation**

1. Navigate to Dashboard → back to Jobs → renders correctly
2. Navigate to Tasks → back to Jobs → renders correctly
