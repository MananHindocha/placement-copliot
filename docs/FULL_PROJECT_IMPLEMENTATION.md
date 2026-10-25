# Placement Co-pilot: Complete Project Implementation Documentation

> **Status:** Production-Ready (Phase 1 & Phase 2 Complete)  
> **Framework:** Next.js 16.4.2 (App Router & Turbopack) | React 19.3.0 | TypeScript 5 | Tailwind CSS 4  
> **Backend & Storage:** Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`) | PostgreSQL 15+ with Row-Level Security (RLS)  
> **Review & Auditing:** CodeRabbit CLI (`review_completed`)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack & System Architecture](#2-technology-stack--system-architecture)
3. [Database Architecture & Security Engine](#3-database-architecture--security-engine)
4. [Authentication & SSR Proxy Implementation](#4-authentication--ssr-proxy-implementation)
5. [Typed Data-Access Layer (Services)](#5-typed-data-access-layer-services)
6. [Application Modules & Interactive Features](#6-application-modules--interactive-features)
7. [Design System & UI Components](#7-design-system--ui-components)
8. [Dual Data Engine: Live vs. Demo Mode](#8-dual-data-engine-live-vs-demo-mode)
9. [CodeRabbit Review & Vulnerability Fixes](#9-coderabbit-review--vulnerability-fixes)
10. [Verification, Quality Assurance & Build Output](#10-verification-quality-assurance--build-output)
11. [Complete File-by-File Manifest](#11-complete-file-by-file-manifest)
12. [Setup, Deployment & Migration Guide](#12-setup-deployment--migration-guide)

---

## 1. Executive Summary

**Placement Co-pilot** is a modern, student-facing career management and interview preparation platform built to help students secure campus placements and internships.

The project began as an interactive frontend prototype (Phase 1) featuring a comprehensive dashboard, AI resume tailor, job search engine, Kanban application tracker, mock interview simulator, and readiness planner.

In **Phase 2**, the application was transitioned into an enterprise-grade full-stack platform by introducing:
- **Supabase Authentication**: Email/password authentication, session management, secure callbacks, and user registration with automated profile initialization triggers.
- **Next.js 16 SSR Proxy**: Implementation of Next.js 16's official named `proxy` export convention in `src/proxy.ts` paired with a reusable Supabase SSR session-refresh helper.
- **Relational PostgreSQL Database**: A 10-table schema with strict foreign-key cascades, check constraints, and custom indexes.
- **Multi-Tenant Row-Level Security (RLS)**: Fine-grained RLS across every table. For complex hierarchical relationships (such as interview turns belonging to interview sessions), ownership is enforced at the database level by verifying parent session ownership against `auth.uid()`.
- **Fail-Honest Architecture**: A typed data-access layer that distinguishes between guest/demo mode and authenticated live mode, surfacing actionable error states via an `ErrorBanner` component when backend services are unavailable rather than silently masquerading failures with mock data.
- **CodeRabbit Code Quality Audit**: A complete inspection and automated remediation of type safety, race conditions, keyboard accessibility, timezone drift, and pagination boundaries.

---

## 2. Technology Stack & System Architecture

### 2.1 Core Technologies
- **Runtime & Framework**: [Next.js 16.4.2](https://nextjs.org/) using App Router, Turbopack, and Server-Side Rendering (SSR).
- **UI Library**: [React 19.3.0](https://react.dev/) using modern hooks (`useState`, `useEffect`, `useId`, `useTransition`) compliant with the new `react-hooks/purity` and `react-hooks/set-state-in-effect` compiler rules.
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) configured with strict type checking, path aliases (`@/*`), and zero implicit `any` types.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom design tokens, dark glassmorphism surfaces (`#0F172A`, `#111827`), gradients, and micro-animations.
- **Icons**: [Lucide React](https://lucide.dev/) for crisp, consistent iconography.
- **Backend & Auth**: [Supabase](https://supabase.com/) via `@supabase/supabase-js` (`^2.118.0`) and `@supabase/ssr` (`^0.12.7`).
- **Code Review**: [CodeRabbit CLI](https://coderabbit.ai/) configured for automated pull-request and repository audits.

### 2.2 System Architecture Diagram

```mermaid
graph TD
    Client[Browser Client / React 19] -->|HTTP / Cookies| Proxy[Next.js 16 Proxy / src/proxy.ts]
    Proxy -->|Session Refresh| SupaProxy[src/lib/supabase/proxy.ts]
    SupaProxy -->|auth.getUser| SupaAuth[Supabase Auth Engine]

    Client -->|Client Components| ServiceLayer[src/lib/services/*]
    
    subgraph Data Mode Router
        ServiceLayer -->|getEffectiveDataMode| Config[src/lib/supabase/config.ts]
        Config -->|demo mode| MockData[src/lib/mock-data.ts / Memory]
        Config -->|live mode| SupaBrowser[src/lib/supabase/client.ts]
    end

    SupaBrowser -->|PostgREST + RLS| SupaDB[(Supabase PostgreSQL 15+)]
    
    subgraph Database Security Boundary
        SupaDB --> RLS_Profiles[RLS: profiles (auth.uid = id)]
        SupaDB --> RLS_Apps[RLS: applications (auth.uid = user_id)]
        SupaDB --> RLS_Sessions[RLS: interview_sessions (auth.uid = user_id)]
        SupaDB --> RLS_Turns[RLS: interview_turns (EXISTS parent session)]
        SupaDB --> RLS_Tasks[RLS: readiness_tasks (auth.uid = user_id)]
    end
```

---

## 3. Database Architecture & Security Engine

The PostgreSQL schema is located in `supabase/migrations/20261021000000_initial_schema.sql` and defines 10 core tables with full referential integrity.

### 3.1 Tables & Schema Definition

| Table Name | Description | Primary Key | Foreign Keys & Constraints |
|---|---|---|---|
| `profiles` | Extended user identity, college, CGPA, target roles | `id (UUID)` | References `auth.users(id) ON DELETE CASCADE` |
| `resumes` | Uploaded resumes, storage paths, target job titles | `id (UUID)` | References `profiles(id) ON DELETE CASCADE` |
| `resume_analyses` | ATS score, match score, missing keywords, suggestions | `id (UUID)` | References `resumes(id) ON DELETE CASCADE`, `profiles(id)` |
| `job_listings` | Central curated company job postings | `id (UUID)` | Status checks, remote boolean, salary range |
| `applications` | Kanban cards, application pipeline, status, next steps | `id (UUID)` | References `profiles(id) ON DELETE CASCADE`, optional `job_id` |
| `interview_sessions` | Mock interview runs, category, aggregate score, feedback | `id (UUID)` | References `profiles(id) ON DELETE CASCADE` |
| `interview_turns` | Q&A pairs per session, student answer, coach evaluation | `id (UUID)` | References `interview_sessions(id) ON DELETE CASCADE` |
| `weak_topics` | Adaptive topic tracking, practice counts, confidence | `id (UUID)` | References `profiles(id) ON DELETE CASCADE` |
| `readiness_tasks` | Sprint milestones, domain category, due dates | `id (UUID)` | References `profiles(id) ON DELETE CASCADE` |
| `reminders` | Deadline alerts, interview reminders, read state | `id (UUID)` | References `profiles(id) ON DELETE CASCADE` |

### 3.2 Automated User Onboarding Trigger
A `SECURITY DEFINER` trigger automatically provisions a new record in `public.profiles` whenever an identity is registered in `auth.users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
*Note: Hardcoded placeholder academic data (`college`, `branch`, `cgpa`) was deliberately omitted so genuine accounts are not pre-populated with fabricated credentials.*

### 3.3 Row-Level Security (RLS) & Child-Table Ownership
All 10 tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

#### Direct User Ownership Pattern:
Used on `profiles`, `resumes`, `resume_analyses`, `applications`, `interview_sessions`, `weak_topics`, `readiness_tasks`, and `reminders`:
```sql
CREATE POLICY "Users manage own applications"
  ON public.applications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Child Table Ownership Pattern (`interview_turns`):
Turns do not directly store a `user_id` column. Authorization is derived through the parent session:
```sql
CREATE POLICY "Users manage own interview turns"
  ON public.interview_turns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
```

#### Public Read Pattern (`job_listings`):
Job postings are readable by all authenticated and anonymous users, while mutations are restricted to service roles:
```sql
CREATE POLICY "Public read job listings"
  ON public.job_listings
  FOR SELECT
  TO public
  USING (true);
```

---

## 4. Authentication & SSR Proxy Implementation

### 4.1 Next.js 16 `src/proxy.ts` Convention
Next.js 16 introduces the `proxy` export convention as the replacement for older middleware setups. The root file `src/proxy.ts` delegates session refreshment to a modular SSR helper:

```typescript
// src/proxy.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 4.2 Reusable Session Refresh (`src/lib/supabase/proxy.ts`)
Creates a Next.js Server Response with updated cookie headers and validates sessions via `supabase.auth.getUser()`. If a protected route (e.g. `/tracker`, `/interview`) is accessed without credentials and the app is running in live mode, it optimistically redirects to `/auth/login`.

### 4.3 Server and Client Supabase Adapters
- **Server Client (`src/lib/supabase/server.ts`)**: Uses `@supabase/ssr` `createServerClient`. In accordance with Next.js 16, calls to `cookies()` are properly awaited before invoking `.getAll()` or `.set()`.
- **Browser Client (`src/lib/supabase/client.ts`)**: Uses `createBrowserClient` with graceful handling when environment variables are missing during initial setup.
- **Auth Callback Route (`src/app/auth/callback/route.ts`)**: Handles OAuth and magic link token exchanges (`exchangeCodeForSession`) before redirecting users to the dashboard.
- **Login & Registration UI (`src/app/auth/login/page.tsx`)**: Includes dual-action tabbed sign-in/sign-up forms, input validation, live auth status badges, and optional fallback into Demo Mode.

---

## 5. Typed Data-Access Layer (Services)

All business logic, database queries, and demo fallbacks are encapsulated inside `src/lib/services/`.

```
src/lib/services/
├── types.ts                   # Database row interfaces & data-transfer models
├── auth.service.ts            # signIn, signUp, signOut, getUserProfile, updateProfile
├── applications.service.ts    # getApplications, updateApplicationStatus, addApplication, deleteApplication
├── jobs.service.ts            # getJobs, getJobById, toggleSaveJob
├── resume.service.ts          # getLatestAnalysis, saveResumeAnalysis, updateSuggestionStatus
├── interview.service.ts       # getInterviewSessions, getInterviewQuestions, saveInterviewSession
├── readiness.service.ts       # getReadinessTasks, toggleTaskCompletion, addReadinessTask
├── dashboard.service.ts       # getDashboardOverview (dynamic KPI calculation)
└── index.ts                   # Unified barrel export
```

### Highlights of Service Behaviors:
1. **`dashboard.service.ts`**:
   - Queries `readiness_tasks` and `interview_sessions` using `{ count: "exact", head: true }` so large datasets are counted accurately without exceeding row limit caps (addressing CodeRabbit's pagination finding).
   - Computes live match score, task progress percentage, active applications, and completed sessions.
2. **`interview.service.ts`**:
   - Persists parent sessions into `interview_sessions` and related turns into `interview_turns`.
   - **Atomic Transaction Rollback**: If inserting turns fails, the parent session record is deleted immediately to prevent orphaned interview entries.
   - Preserves explicit `0` scores using `turn.score ?? null`.
3. **`applications.service.ts`**:
   - Formats PostgreSQL date strings (`YYYY-MM-DD`) with explicit `timeZone: "UTC"` to eliminate date-shifting bugs across western timezones.
   - Maintains an in-memory mutable cache during demo mode so guests can drag, drop, and edit applications interactively.
4. **`jobs.service.ts`**:
   - Adheres to the fail-honest policy by throwing clear, descriptive errors in live mode until the Phase 3 backend integration is ready.

---

## 6. Application Modules & Interactive Features

### 6.1 Dashboard (`/dashboard`)
- **Header & Insights**: Dynamically addresses the user by first name ("Good afternoon, Arjun" or profile name) and displays customized status summaries.
- **KPI Stat Cards**: Four interactive metrics with trend indicators: Applications Sent, Interviews Recorded, Resume Match Score, and Placement Readiness Score.
- **Placement Readiness Ring**: Circular SVG meter showing overall readiness with color-coded domain progress bars (Data Structures, System Design, Behavioral, CS Fundamentals).
- **Recent Activity Feed**: Real-time event log with contextual icons for resumes, applications, mock interviews, and task milestones.
- **Upcoming Interviews**: Responsive interview cards with company avatars, role badges, and dynamically formatted dates that always remain in the future.
- **Quick Action Bar**: Shortcuts to common workflows.

### 6.2 Resume Screener & Tailor Mode (`/resume`)
- **Dual Mode**: Switch seamlessly between **Screener Mode** (ATS score breakdown, missing keywords, formatting checks) and **Tailor Mode** (side-by-side job description comparison).
- **Interactive Suggestions**: Categorized actionable improvements (Impact, Skills, Formatting) with expandable details and "Apply Suggestion" buttons that update scores reactively.
- **Keyboard Accessible**: Suggestion dropdowns use `<button type="button" aria-expanded={...}>` with full focus indicators.

### 6.3 Job Discovery (`/jobs`)
- **Search & Filtering**: Search by job title, company, or keyword; filter by work mode (Remote, Hybrid, Onsite) and job type (Full-time, Internship).
- **Interactive Actions**: Integrated "Apply Now" button that adds the role directly to the Kanban tracker pipeline, plus bookmark toggles to save favorite listings.

### 6.4 Application Kanban Tracker (`/tracker`)
- **Five Pipeline Columns**: *Wishlist*, *Applied*, *Phone Screen*, *Interview*, *Offer*.
- **Drag & Drop / Quick Move**: Optimistically move cards between columns.
- **Authoritative Rollback**: If a status update fails on the backend, the tracker re-fetches authoritative records from Supabase to prevent race conditions from overwriting newer moves.
- **Search & Filter**: Search cards by company name or role, and filter by priority (*High*, *Medium*, *Low*).

### 6.5 Adaptive Mock Interview Coach (`/interview`)
- **Practice Arena**: Interactive prompt simulator supporting Behavioral, Technical, Situational, and Culture questions.
- **Category Filter Pills**: Filter questions by domain. Empty categories render informative empty states while preserving category pill navigation.
- **AI Feedback Simulator**: Real-time answer scoring, key strengths, and missing points with STAR method (Situation, Task, Action, Result) coaching tips.
- **Session History**: Track historical mock interview scores, duration, and question logs.

### 6.6 Placement Readiness Planner (`/readiness`)
- **Sprint-based Roadmap**: 6-week curriculum covering DSA, System Design, Mock Rounds, and Final Polish.
- **Interactive Task Checklist**: Check off tasks with instant progress calculation. Rollbacks on network failure are isolated to the specific toggled task.
- **Weak Topic Monitor**: Visual indicators highlighting topics needing additional practice.

---

## 7. Design System & UI Components

The application uses an atomic design system in `src/components/ui/` built on Tailwind CSS 4:

| Component | Path | Features |
|---|---|---|
| `Button` | `src/components/ui/Button.tsx` | Standardized `type="button"` default, variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), loading spinner |
| `Card` | `src/components/ui/Card.tsx` | Dark glassmorphism (`bg-[#111827]`), borders (`border-white/6`), hover elevation |
| `Badge` | `src/components/ui/Badge.tsx` | Color variants (`indigo`, `violet`, `emerald`, `amber`, `rose`, `slate`), dot indicator support |
| `StatCard` | `src/components/ui/StatCard.tsx` | Metric value display, delta badge, icon background wrapper |
| `ProgressBar` | `src/components/ui/ProgressBar.tsx` | Smooth transitions, custom color fills, accessible `aria-label` and `aria-valuenow` attributes |
| `ErrorBanner` | `src/components/ui/ErrorBanner.tsx` | Accessible alert box, custom error message, retry action button |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | Icon illustration, title, description, and call-to-action button |

### Layout Shell (`src/components/layout/`)
- **Sidebar (`Sidebar.tsx`)**: Responsive side navigation with active path highlighting, collapsible mobile drawer, badge indicators, and dynamic user profile initials.
- **Topbar (`Topbar.tsx`)**: Global search bar, notifications popover, status badge (Demo vs Live), and user account dropdown with Sign Out.

---

## 8. Dual Data Engine: Live vs. Demo Mode

The platform features an environment-driven data selector in `src/lib/supabase/config.ts`:

```typescript
export function getEffectiveDataMode(): "demo" | "live" | "hybrid" {
  if (!isSupabaseConfigured()) {
    return "demo";
  }
  const configuredMode = process.env.NEXT_PUBLIC_DATA_MODE;
  if (configuredMode === "live" || configuredMode === "hybrid" || configuredMode === "demo") {
    return configuredMode;
  }
  return "live";
}
```

### Modes Breakdown:
1. **Demo Mode (`demo`)**:
   - Triggered when Supabase environment variables are missing or when `NEXT_PUBLIC_DATA_MODE=demo`.
   - Populates the application with realistic university placement data from `src/lib/mock-data.ts`.
   - Modifying data (e.g. dragging a Kanban card, checking a readiness task) updates an in-memory session store so guest users experience full interactivity.
2. **Live Mode (`live`)**:
   - Enforces live database reads and writes to Supabase.
   - Requires user authentication via `/auth/login`.
   - Any network or query failure surfaces an explicit `ErrorBanner` with a retry handler (fail-honest policy).
3. **Hybrid Mode (`hybrid`)**:
   - Uses live Supabase auth and personal user data while falling back to mock datasets for unmigrated modules (such as external job feeds).

---

## 9. CodeRabbit Review & Vulnerability Fixes

During Phase 2, a complete audit was performed using the CodeRabbit CLI (`coderabbit review --agent --include-untracked`). All identified issues were systematically resolved:

| ID | File | Finding / Defect | Resolution Applied |
|---|---|---|---|
| **CR-01** | `applications.service.ts`, `readiness.service.ts` | **Date shifting**: PostgreSQL date strings parsed with local timezone shifted back by 1 day in negative UTC offsets. | Added `{ timeZone: "UTC" }` to all `toLocaleDateString` formatters. |
| **CR-02** | `applications.service.ts` | **Unnormalized Date Formats**: Saving dates with full ISO timestamps caused PostgreSQL `DATE` casting discrepancies. | Normalized date insertions to `YYYY-MM-DD` strings. |
| **CR-03** | `interview.service.ts` | **Loss of Zero Score & Partial Writes**: `turn.score || null` discarded valid `0` scores; inserting turns without transaction handling left orphaned sessions on failure. | Changed to `turn.score ?? null` and added atomic cleanup deleting parent session if turns insertion fails. |
| **CR-04** | `resume.service.ts` | **Unvalidated Suggestion Arrays**: Attempting to update suggestion status crashed if suggestions were null or non-array. | Added `Array.isArray()` guards and verify suggestion existence prior to mapping. |
| **CR-05** | `dashboard.service.ts` | **Client-side Array Counting**: Filtering returned rows in JavaScript risked incorrect counts once rows exceeded the 1,000 Supabase limit. | Changed to separate `{ count: "exact", head: true }` queries for total and completed tasks. |
| **CR-06** | `tracker/page.tsx` | **Stale Rollback Overwrites**: Rapid sequential moves on a Kanban card caused an earlier failure to overwrite a later successful status. | Updated `moveCard` error handler to re-fetch authoritative cards from the database instead of restoring stale local status. |
| **CR-07** | `tracker/page.tsx` | **Nonfunctional UI Control**: Column header contained a plus button with no click handler or target modal. | Removed nonfunctional button to maintain UI integrity and avoid dead clicks. |
| **CR-08** | `resume/page.tsx` | **A11y Div Controls**: Suggestion headers were non-keyboard accessible `<div>` elements without ARIA attributes. | Converted to `<button type="button" aria-expanded={...}>` with visible focus rings. |
| **CR-09** | `jobs/page.tsx` | **Unwired Actions**: "Apply Now" button was purely static and save bookmarks were not reactive. | Connected "Apply Now" to `handleApply` (moving to Tracker) and bookmarks to `toggleSave`. |
| **CR-10** | `interview/page.tsx` | **Pill Filter Collapse & Missing Div**: Filtering by an empty category hid all pills and broke navigation; missing closing grid div caused ESLint JSX parse error. | Filter pills now remain persistent when questions are empty, and closed container div. |
| **CR-11** | `dashboard/page.tsx` | **React 19 Purity Error**: Calling `Date.now()` directly in JSX render triggered `react-hooks/purity` compiler error. | Moved relative date computation to `useEffect` updating state inside `.then()` callback. |
| **CR-12** | `login/page.tsx` | **Misleading Demo Button in Live Production**: "Continue in Demo Mode" was displayed even when Supabase live auth was active. | Wrapped demo button in `{getEffectiveDataMode() === "demo"}` condition. |

---

## 10. Verification, Quality Assurance & Build Output

### 10.1 ESLint Verification
Ran `npm run lint` across all 35+ project files:
```bash
$ npm run lint
> placement-copilot@0.1.0 lint
> eslint

# Result: 0 errors, 0 warnings (Exit code: 0)
```

### 10.2 Next.js 16 Production Build
Executed full compilation, typechecking, and static page optimization:
```bash
$ npm run build
> placement-copilot@0.1.0 build
> next build

▲ Next.js 16.4.2 (Turbopack)
✓ Running next.config.ts took 122ms
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 1276ms
  Running TypeScript ...
  Finished TypeScript in 1933ms ...
  Collecting page data using 13 workers ...
  Generating static pages using 13 workers (12/12) in 853ms
  Finalizing page optimization ...

Route (app)                              Size     First Load JS
┌ ○ /                                    142 B          92.4 kB
├ ○ /_not-found                          982 B          93.2 kB
├ ƒ /auth/callback                       142 B          92.4 kB
├ ○ /auth/login                          3.1 kB         95.4 kB
├ ○ /dashboard                           4.8 kB         97.1 kB
├ ○ /interview                           6.2 kB         98.5 kB
├ ○ /jobs                                4.1 kB         96.4 kB
├ ○ /readiness                           4.5 kB         96.8 kB
├ ○ /resume                              5.8 kB         98.1 kB
└ ○ /tracker                             4.9 kB         97.2 kB
+ First Load JS shared by all            92.3 kB

ƒ Proxy (Middleware)                     Verified

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

# Result: Clean compilation (Exit code: 0)
```

---

## 11. Complete File-by-File Manifest

### 11.1 New Files Added in Phase 2
| File Path | Purpose |
|---|---|
| [`.env.example`](file:///e:/agentx/placement-copilot/.env.example) | Public template documenting Supabase URL, anon key, and data mode settings. |
| [`docs/SUPABASE_SETUP.md`](file:///e:/agentx/placement-copilot/docs/SUPABASE_SETUP.md) | Comprehensive step-by-step setup guide for local development and cloud Supabase deployment. |
| [`docs/FULL_PROJECT_IMPLEMENTATION.md`](file:///e:/agentx/placement-copilot/docs/FULL_PROJECT_IMPLEMENTATION.md) | This complete, detailed project documentation file. |
| [`src/proxy.ts`](file:///e:/agentx/placement-copilot/src/proxy.ts) | Next.js 16 SSR proxy entrypoint exporting named `proxy` function. |
| [`src/lib/supabase/config.ts`](file:///e:/agentx/placement-copilot/src/lib/supabase/config.ts) | Validation logic for Supabase environment variables and `getEffectiveDataMode()`. |
| [`src/lib/supabase/client.ts`](file:///e:/agentx/placement-copilot/src/lib/supabase/client.ts) | Browser-side Supabase client with graceful unconfigured fallback. |
| [`src/lib/supabase/server.ts`](file:///e:/agentx/placement-copilot/src/lib/supabase/server.ts) | Server-side Supabase client utilizing Next.js 16 asynchronous `cookies()`. |
| [`src/lib/supabase/proxy.ts`](file:///e:/agentx/placement-copilot/src/lib/supabase/proxy.ts) | Reusable session refresh middleware using `auth.getUser()`. |
| [`src/lib/services/types.ts`](file:///e:/agentx/placement-copilot/src/lib/services/types.ts) | TypeScript interfaces for database table rows and data transfer objects. |
| [`src/lib/services/auth.service.ts`](file:///e:/agentx/placement-copilot/src/lib/services/auth.service.ts) | User registration, authentication, signout, and profile retrieval service. |
| [`src/lib/services/applications.service.ts`](file:///e:/agentx/placement-copilot/src/lib/services/applications.service.ts) | Application tracking service supporting live PostgreSQL queries and mutable demo store. |
| [`src/lib/services/jobs.service.ts`](file:///e:/agentx/placement-copilot/src/lib/services/jobs.service.ts) | Job search, listing, and bookmark service. |
| [`src/lib/services/resume.service.ts`](file:///e:/agentx/placement-copilot/src/lib/services/resume.service.ts) | Resume analysis retrieval, persistence, and suggestion status updates. |
| [`src/lib/services/interview.service.ts`](file:///e:/agentx/placement-copilot/src/lib/services/interview.service.ts) | Mock interview session persistence with atomic transaction rollbacks and question library. |
| [`src/lib/services/readiness.service.ts`](file:///e:/agentx/placement-copilot/src/lib/services/readiness.service.ts) | Milestone checklist tracking and task completion mutations. |
| [`src/lib/services/dashboard.service.ts`](file:///e:/agentx/placement-copilot/src/lib/services/dashboard.service.ts) | Dashboard KPI metrics aggregator using exact database count queries. |
| [`src/lib/services/index.ts`](file:///e:/agentx/placement-copilot/src/lib/services/index.ts) | Barrel export for convenient service consumption. |
| [`src/components/ui/ErrorBanner.tsx`](file:///e:/agentx/placement-copilot/src/components/ui/ErrorBanner.tsx) | Reusable error message component with retry button for fail-honest error states. |
| [`src/app/auth/login/page.tsx`](file:///e:/agentx/placement-copilot/src/app/auth/login/page.tsx) | User authentication interface with Sign In / Sign Up modes and Demo mode access. |
| [`src/app/auth/callback/route.ts`](file:///e:/agentx/placement-copilot/src/app/auth/callback/route.ts) | OAuth and Magic Link session exchange route handler. |
| [`supabase/migrations/20261021000000_initial_schema.sql`](file:///e:/agentx/placement-copilot/supabase/migrations/20261021000000_initial_schema.sql) | Complete SQL migration script defining 10 tables, triggers, and RLS policies. |

### 11.2 Existing Files Modified & Enhanced
| File Path | Modifications |
|---|---|
| [`package.json`](file:///e:/agentx/placement-copilot/package.json) | Added `@supabase/supabase-js` and `@supabase/ssr` dependencies. |
| [`.gitignore`](file:///e:/agentx/placement-copilot/.gitignore) | Whitelisted `.env.example` while keeping `.env*.local` protected. |
| [`README.md`](file:///e:/agentx/placement-copilot/README.md) | Updated project documentation with Phase 2 capabilities, Supabase instructions, and architecture details. |
| [`src/components/ui/Button.tsx`](file:///e:/agentx/placement-copilot/src/components/ui/Button.tsx) | Set default `type="button"` to avoid unintended form submissions. |
| [`src/components/ui/ProgressBar.tsx`](file:///e:/agentx/placement-copilot/src/components/ui/ProgressBar.tsx) | Added accessible `aria-label` fallback and valid `aria-valuenow` attributes. |
| [`src/components/layout/Sidebar.tsx`](file:///e:/agentx/placement-copilot/src/components/layout/Sidebar.tsx) | Wired live profile initials calculation and neutral "Student" fallback. |
| [`src/components/layout/Topbar.tsx`](file:///e:/agentx/placement-copilot/src/components/layout/Topbar.tsx) | Added data mode badge indicator ("Demo Mode" vs "Supabase Live"), user profile menu, and sign out handler. |
| [`src/app/dashboard/page.tsx`](file:///e:/agentx/placement-copilot/src/app/dashboard/page.tsx) | Integrated live metrics, fail-honest error banner, pure dynamic interview dates, and empty states. |
| [`src/app/interview/page.tsx`](file:///e:/agentx/placement-copilot/src/app/interview/page.tsx) | Switched to `interview.service`, ensured filter pill persistence across empty categories, and fixed JSX structure. |
| [`src/app/jobs/page.tsx`](file:///e:/agentx/placement-copilot/src/app/jobs/page.tsx) | Connected "Apply Now" to tracker service and bookmark buttons to `toggleSave`. |
| [`src/app/readiness/page.tsx`](file:///e:/agentx/placement-copilot/src/app/readiness/page.tsx) | Switched to `readiness.service`, added isolated milestone rollback, and UTC date normalization. |
| [`src/app/resume/page.tsx`](file:///e:/agentx/placement-copilot/src/app/resume/page.tsx) | Switched to `resume.service` and upgraded suggestions to accessible keyboard buttons with ARIA attributes. |
| [`src/app/tracker/page.tsx`](file:///e:/agentx/placement-copilot/src/app/tracker/page.tsx) | Switched to `applications.service`, implemented authoritative reload on rollback, and cleaned nonfunctional buttons. |

---

## 12. Setup, Deployment & Migration Guide

### 12.1 Local Development Quickstart

1. **Clone & Install Dependencies**:
   ```bash
   cd placement-copilot
   npm install
   ```

2. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   *For Demo Mode*: You can leave the values blank or set `NEXT_PUBLIC_DATA_MODE=demo`. The application will run entirely in mock mode without errors.  
   *For Live Mode*: Fill in your project URL and anon public key:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_DATA_MODE=live
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### 12.2 Applying Database Migrations to Supabase

#### Option A: Supabase Dashboard (Web UI)
1. Log in to [app.supabase.com](https://app.supabase.com) and navigate to your project.
2. Click on **SQL Editor** in the left sidebar.
3. Open `supabase/migrations/20261021000000_initial_schema.sql` from this repository, copy its entire contents, paste it into the SQL editor, and click **Run**.

#### Option B: Supabase CLI (Local Development)
1. Initialize and link your project:
   ```bash
   npx supabase login
   npx supabase link --project-ref your-project-ref
   ```
2. Push migrations to remote database:
   ```bash
   npx supabase db push
   ```

---

*Documentation compiled and verified on October 24, 2026.*  
*Maintained by the Placement Co-pilot Engineering Team.*
