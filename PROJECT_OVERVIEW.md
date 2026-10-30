# Placement Co-pilot: Complete In-Depth Project Architecture & Variable Reference

This document provides a comprehensive technical overview and reference of **Placement Co-pilot** as of the latest version. It covers the overall system architecture, database schema, API route handlers, service layer, frontend pages, state variables, and mock data models.

---

## 1. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16.4.2 APP ROUTER                       │
│                        React 19 · TypeScript 5                         │
│                    Tailwind CSS v4 (Glassmorphic Dark)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
    ┌─────────────────┐                           ┌─────────────────┐
    │  Client Pages   │                           │ API Route Layer │
    │  & Components   │                           │ (/api/jobs/*)   │
    └────────┬────────┘                           └────────┬────────┘
             │                                             │
             ▼                                             │
    ┌───────────────────────────────────┐                  │
    │          SERVICES LAYER           │                  │
    │  (Dual-Engine: Demo vs Live DB)   │◄─────────────────┘
    └────────┬─────────────────┬────────┘
             │                 │
    [Mode = "demo"]     [Mode = "live"]
             │                 │
             ▼                 ▼
    ┌─────────────────┐ ┌───────────────────────────┐
    │  In-Memory /    │ │ Supabase (PostgreSQL 15) │
    │  mock-data.ts   │ │ Auth · RLS · Storage     │
    └─────────────────┘ └───────────────────────────┘
```

### Key Technical Foundations:
- **Framework:** Next.js 16.4.2 (App Router with Turbopack compilation).
- **Runtime / Language:** React 19, TypeScript 5.x (Strict Type Checking, zero compile errors).
- **Styling:** Tailwind CSS v4 featuring a custom glassmorphism dark theme (`bg-[#060d1a]`, `border-white/5` to `border-white/10`, blurred backdrop cards).
- **Dual-Data Mode Engine:** Every service dynamically inspects `getEffectiveDataMode()`:
  - **`demo` mode:** Uses enriched local memory stores seeded from `mock-data.ts` — enabling complete, instantaneous guest usage with zero configuration or API keys.
  - **`live` mode:** Activates Supabase Client/Server with Row Level Security (RLS) tied to authenticated student sessions.
- **AI Matching Engine:** Google Gemini 2.0 Flash integration with an in-memory cached heuristic fallback algorithm.

---

## 2. Environment Variables & Configuration

Defined in `src/lib/supabase/config.ts` and project root:

| Variable Name | Type | Scope | Description & Behavior |
|:---|:---|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | `string` | Client & Server | Supabase project endpoint (e.g. `https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `string` | Client & Server | Supabase public anon/publishable key for browser clients. |
| `NEXT_PUBLIC_DATA_MODE` | `"demo" \| "live"` | Client & Server | Explicit data mode toggle. If unset or invalid credentials, defaults to `"demo"`. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `string` | Server only | Optional Gemini API key. When present, enables real-time LLM job matching. |
| `OPENWEBNINJA_API_KEY` | `string` | Server only | Primary OpenWeb Ninja JSearch API key for Indian & global tech jobs. |
| `HIMALAYAS_API_KEY` | `string` | Server only | Supplementary Himalayas API key for remote & worldwide tech roles. |

---

## 3. Data Models & Shared Types

Defined in `src/types/index.ts`:

### Core Domain Types

```typescript
// Navigation
export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: number;
};

// Dashboard
export type StatCard = {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: string;
  color: "indigo" | "emerald" | "amber" | "rose" | "violet";
};

export type Activity = {
  id: string;
  type: "application" | "resume" | "interview" | "job" | "readiness";
  message: string;
  timestamp: string;
  avatar?: string;
};

// Resume Analysis
export type ResumeAnalysis = {
  matchScore: number;
  atsScore: number;
  jobTitle: string;
  company: string;
  strengths: string[];
  gaps: string[];
  suggestions: TailorSuggestion[];
  keywords: { word: string; present: boolean }[];
};

export type TailorSuggestion = {
  id: string;
  section: "summary" | "experience" | "skills" | "education";
  original: string;
  suggested: string;
  impact: "high" | "medium" | "low";
};

// Job Listings
export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Full-time" | "Internship" | "Contract" | "Part-time";
  salary: string;
  matchScore: number;
  posted: string;
  tags: string[];
  logo: string;
  saved: boolean;
  applied: boolean;
  description: string;
};

// Kanban Application Tracking
export type KanbanStatus =
  | "Wishlist"
  | "Applied"
  | "Phone Screen"
  | "Interview"
  | "Offer"
  | "Rejected";

export type KanbanCard = {
  id: string;
  title: string;
  company: string;
  logo: string;
  status: KanbanStatus;
  appliedDate?: string;
  nextStep?: string;
  nextStepDate?: string;
  matchScore: number;
  priority: "high" | "medium" | "low";
  notes?: string;
};

// Mock Interviews
export type InterviewQuestion = {
  id: string;
  category: "behavioral" | "technical" | "situational" | "culture";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  hint: string;
  sampleAnswer: string;
  followUps: string[];
};

export type InterviewSession = {
  id: string;
  date: string;
  role: string;
  score: number;
  questionsAnswered: number;
  duration: string;
  feedback: string;
};

// Readiness Milestones & Domains
export type ReadinessMilestone = {
  id: string;
  category: "resume" | "skills" | "network" | "interview" | "applications";
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  priority: "high" | "medium" | "low";
};

export type ReadinessDomain = {
  label: string;
  score: number;
  color: string;
  icon: string;
};
```

---

## 4. Database Schema (Supabase PostgreSQL)

Defined in `supabase/migrations/20261021000000_initial_schema.sql` and mirrored in `src/lib/services/types.ts`:

| Table Name | Primary Columns & Types | Purpose |
|:---|:---|:---|
| `profiles` | `id` (UUID, PK → `auth.users`), `full_name`, `avatar_url`, `college`, `branch`, `graduation_year`, `cgpa`, timestamps | Student academic profile and contact info |
| `applications` | `id` (UUID), `user_id` (FK), `job_id`, `company`, `title`, `logo`, `status` (`KanbanStatus`), `priority`, `applied_date`, `next_step`, `next_step_date`, `match_score`, `notes` | Application Tracker Kanban cards |
| `job_listings` | `id` (UUID), `title`, `company`, `location`, `job_type`, `salary_range`, `match_score`, `description`, `tags` (text[]), `logo_url`, `is_active`, `posted_at` | Active job postings catalog |
| `interview_sessions` | `id` (UUID), `user_id` (FK), `role`, `category`, `score`, `questions_answered`, `duration_seconds`, `feedback`, `completed` | Recorded mock interview session summaries |
| `interview_turns` | `id` (UUID), `session_id` (FK), `question_id`, `question_text`, `user_answer`, `ai_feedback`, `score`, `turn_order` | Individual Q&A turns within an interview |
| `readiness_tasks` | `id` (UUID), `user_id` (FK), `category`, `title`, `description`, `completed` (boolean), `due_date`, `priority` | Roadmap milestone checklist items |
| `resume_analyses` | `id` (UUID), `user_id` (FK), `resume_id`, `target_role`, `target_company`, `match_score`, `ats_score`, `strengths` (text[]), `gaps` (text[]), `suggestions` (JSONB), `keywords` (JSONB) | Saved ATS and match score evaluations |

---

## 5. API Routes Layer (`src/app/api/`)

### 1. `POST /api/jobs/match`
- **File:** `src/app/api/jobs/match/route.ts`
- **Input Payload:**
  - `jobs: MatchInput[]` where each object contains:
    - `jobId: string`
    - `jobTitle: string`
    - `jobDescription: string`
    - `jobTags: string[]`
  - `userSkills?: string[]` (Defaults to `DEMO_USER_SKILLS` if empty)
  - `userTargetRole?: string` (Defaults to `"Software Engineer"`)
- **Output:** `{ results: MatchResult[], source: "gemini" | "heuristic" }`
  - `MatchResult`:
    - `jobId: string`
    - `matchScore: number` (0 to 100)
    - `matchedSkills: string[]`
    - `missingSkills: string[]` (max 5)
    - `matchReason: string` (one-line evaluation, max 120 chars)
    - `fitLabel: "Strong Fit" | "Good Fit" | "Partial Fit" | "Low Fit"`
- **Internal Variables & Logic:**
  - `matchCache = new Map<string, MatchResult>()`: In-memory memoization cache so identical jobs are not re-scored.
  - `scoreWithGemini()`: Calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}` with structured JSON generation and 10s abort timeout.
  - `scoreHeuristic()`: Algorithmic fallback checking cross-intersection of skills and tech keywords (`React`, `TypeScript`, `SQL`, `Docker`, `System Design`, etc.).

### 2. `GET /api/jobs/search`
- **File:** `src/app/api/jobs/search/route.ts`
- **Query Parameters:**
  - `q: string` (keyword search)
  - `location: string` (geographic query)
  - `country: string` (defaults to `"in"`)
  - `mode: "demo" | "live"`
- **Output:** `{ jobs: Job[], source: "openwebninja" | "himalayas" | "demo", total: number }`
- **Internal Variables & Helpers:**
  - `timeAgo(dateStr)`: Converts UTC timestamps into human-readable relative dates (`"2 days ago"`, `"Today"`).
  - `formatSalary(min, max)`: Formats numbers into INR (₹) or USD ($) bracket strings.
  - Multi-tier dual provider architecture:
    1. Tries **OpenWeb Ninja API** (`OPENWEBNINJA_API_KEY`) for Indian & global roles.
    2. Queries **Himalayas Remote API** (`HIMALAYAS_API_KEY`) for worldwide remote listings.
    3. Falls back to local curated dataset (`JOBS` + `EXTENDED_JOBS`) with fuzzy matching on title, company, description, and tags when no API keys or in demo mode.

---

## 6. Service Layer (`src/lib/services/`)

All services isolate database and API logic from UI components:

### 1. `jobs.service.ts`
- **File:** `src/lib/services/jobs.service.ts`
- **Module Variables:**
  - `demoJobs: Job[]`: In-memory array containing initial 6 mock jobs + 14 extended Indian tech jobs.
  - `DEFAULT_FILTERS: JobFilters`:
    - `search: ""`
    - `location: ""`
    - `jobTypes: []`
    - `experienceLevel: ""`
    - `minMatchScore: 0`
    - `salaryMin: 0`
    - `salaryMax: 30`
    - `includeSalaryNotDisclosed: true`
    - `skills: []`
    - `postedWithin: "any"`
- **Exported Functions:**
  - `getJobs()`: Fetches job catalog.
  - `searchJobs(query, location)`: Calls `/api/jobs/search`.
  - `scoreJobMatches(jobs, userSkills, userTargetRole)`: Batches jobs to `/api/jobs/match`.
  - `applyFilters(jobs, filters, matchScores)`: Multi-criteria client-side filter engine with regex salary parsing (detects INR LPA ranges like `₹18L - ₹28L` vs USD `$140k`) and date math.
  - `getUserSkills()`: Returns student skills list (`DEMO_USER_SKILLS`).
  - `toggleSaveJob(id, saved)`: Toggles bookmark status.

### 2. `dashboard.service.ts`
- **File:** `src/lib/services/dashboard.service.ts`
- **Exported Functions:**
  - `getDashboardOverview()`: Returns `DashboardOverview` (`{ stats, activities, readinessDomains }`).
  - In demo mode: returns `STATS`, `ACTIVITIES`, and `READINESS_DOMAINS`.
  - In live mode: executes `Promise.all` across Supabase tables (`applications`, `interview_sessions`, `resume_analyses`, `readiness_tasks`) to compute live counts and percentages.

### 3. `applications.service.ts`
- **File:** `src/lib/services/applications.service.ts`
- **Module Variables:**
  - `demoCards: KanbanCard[]`: Reactive client-side store of Kanban applications.
- **Exported Functions:**
  - `getApplications()`: Retrieves all pipeline cards sorted by date.
  - `updateApplicationStatus(id, newStatus)`: Moves card between Kanban columns.
  - `addApplication(card)`: Inserts a new tracked application.

### 4. `interview.service.ts`
- **File:** `src/lib/services/interview.service.ts`
- **Module Variables:**
  - `demoSessions: InterviewSession[]`: In-memory store of past mock interview sessions.
- **Exported Functions:**
  - `getInterviewQuestions()`: Returns standard questions covering Behavioral, Technical, Situational, and Culture categories.
  - `getPastInterviewSessions()`: Fetches historical scores and feedback.
  - `recordInterviewSession(session, turns)`: Saves session results.

### 5. `readiness.service.ts`
- **File:** `src/lib/services/readiness.service.ts`
- **Module Variables:**
  - `demoMilestones: ReadinessMilestone[]`: In-memory store of preparation tasks.
- **Exported Functions:**
  - `getReadinessMilestones()`: Retrieves student milestone checklist.
  - `getReadinessDomains()`: Retrieves the 5 pillar scores (Resume, Skills, Networking, Interviews, Applications).
  - `toggleMilestone(id, completed)`: Toggles checklist state.

### 6. `auth.service.ts`
- **File:** `src/lib/services/auth.service.ts`
- **Module Variables:**
  - `DEMO_USER_PROFILE: UserProfile`:
    ```typescript
    {
      id: "demo-user-1",
      fullName: "Arjun Kumar",
      email: "arjun.kumar@nitt.edu",
      college: "NIT Trichy",
      branch: "Computer Science & Engineering",
      graduationYear: 2026,
      cgpa: 8.85
    }
    ```
- **Exported Functions:**
  - `getCurrentUser()`: Resolves Supabase Auth user session.
  - `getUserProfile()`: Returns profile info or fallback demo profile.
  - `signOutUser()`: Logs out and clears sessions.

### 7. `resume.service.ts`
- **File:** `src/lib/services/resume.service.ts`
- **Module Variables:**
  - `demoAnalysis: ResumeAnalysis`: Active resume scan results and suggestions.
- **Exported Functions:**
  - `getResumeAnalysis()`: Returns ATS score, match score, strengths, gaps, and suggestions.
  - `updateTailorSuggestion(id, text)`: Updates tailored bullet points.

---

## 7. Frontend Pages & State Variables (`src/app/`)

### 1. `/dashboard` (Overview)
- **File:** `src/app/dashboard/page.tsx`
- **State Variables:**
  - `data: DashboardOverview | null`: Stores stats, activities, and readiness domains.
  - `profile: UserProfile | null`: Stores student name, college, CGPA.
  - `loading: boolean`: Controls skeleton/spinner state.
  - `error: string | null`: Displays error banner if data fetching fails.
  - `interviewDates: { date1, date2, date3 }`: Mock schedule for upcoming interview cards.
- **Key UI Components:**
  - Metric Cards: Applications Sent (24), Interviews Scheduled (5), Resume Match Score (82%), Readiness Score (74%).
  - Readiness Pillars Radar breakdown with individual progress bars.
  - Real-time Activity Timeline (`application`, `interview`, `resume`, `job`, `readiness`).
  - Next Steps / Upcoming Interviews calendar widget with countdown badges.

### 2. `/jobs` (Enhanced Job Discovery)
- **File:** `src/app/jobs/page.tsx`
- **State Variables:**
  - `allJobs: Job[]`: Unfiltered catalog of loaded jobs.
  - `filteredJobs: Job[]`: Post-filter array currently displayed in list view.
  - `selectedJob: Job | null`: Currently active job displayed in right split-pane detail view.
  - `loading: boolean`: Loading state for initial catalog load.
  - `searching: boolean`: Debounced loading indicator for live search inputs.
  - `scoringLoading: boolean`: Loading indicator when AI is scoring match fit.
  - `error: string | null`: Error message state.
  - `filters: JobFilters`: Active filter parameters (search, location, types, experience, match score, salary range, skills, posted within).
  - `matchScores: Map<string, MatchResult>`: Stores AI match analysis per `jobId`.
  - `savedJobIds: Set<string>`: Set of bookmarked job IDs.
  - `appliedJobIds: Set<string>`: Set of applied job IDs.
  - `userSkills: string[]`: Skills list used for matching tags and highlights.
  - `dataSource: "openwebninja" | "himalayas" | "demo"`: Source badge showing where jobs were retrieved.
  - `isMobileFilterOpen: boolean`: Toggle for mobile filter drawer.
  - `showApplyModal: boolean`: Modal for submitting quick application.
- **Key UI Components:**
  - Collapsible Sidebar Filter Panel: 7 filter accordions with instant reset.
  - Dual Search Inputs: Role/Keyword + Location with 350ms debounce.
  - Rich Job Card: Logo, title, company, salary, location, type badge, match score pill, AI fit label (`Strong Fit`, `Good Fit`, etc.), skill tags.
  - Detail Split-Pane: Full description, AI Match Insights panel (matched skills, missing skills, match reasoning), "Apply Now" button, and bookmark toggle.

### 3. `/tracker` (Application Kanban Pipeline)
- **File:** `src/app/tracker/page.tsx`
- **State Variables:**
  - `cards: KanbanCard[]`: List of tracked job applications across all stages.
  - `loading: boolean`: Data load state.
  - `error: string | null`: Error state.
  - `searchQuery: string`: Search input to filter company/role.
  - `priorityFilter: "all" | "high" | "medium" | "low"`: Filter cards by priority.
- **Key UI Components:**
  - 6 Pipeline Columns: `Wishlist` → `Applied` → `Phone Screen` → `Interview` → `Offer` → `Rejected`.
  - Status Progression Buttons: Move card forward or backward along the pipeline with auto-sync.
  - Card Details: Company logo, title, match score, priority tag, applied date, next step countdown.

### 4. `/interview` (Mock Interview Coach)
- **File:** `src/app/interview/page.tsx`
- **State Variables:**
  - `questions: InterviewQuestion[]`: Practice question bank.
  - `sessions: InterviewSession[]`: Previous mock session history.
  - `loading: boolean`: Loading state.
  - `error: string | null`: Error state.
  - `activeSection: "practice" | "history"`: Tab toggle.
  - `currentIdx: number`: Current flashcard index.
  - `showHint: boolean`: Toggle hint visibility.
  - `showAnswer: boolean`: Toggle sample answer visibility.
  - `isRecording: boolean`: Simulated mic recording toggle.
  - `timer: number`: Recording duration counter.
  - `categoryFilter: "all" | "behavioral" | "technical" | "situational" | "culture"`.
- **Key UI Components:**
  - Practice Card: Question text, category badge, difficulty indicator, collapsible hint box, sample STAR-method answer, and follow-up prompts.
  - Speech Recording Simulator: Timer with pulse animation.
  - Session History Table: Past scores (e.g. 88/100), duration, questions answered, and AI feedback notes.

### 5. `/readiness` (Placement Readiness Plan)
- **File:** `src/app/readiness/page.tsx`
- **State Variables:**
  - `milestones: ReadinessMilestone[]`: Roadmap task checklist.
  - `domains: ReadinessDomain[]`: 5 domain scores.
  - `loading: boolean`: Loading state.
  - `error: string | null`: Error state.
  - `activeCategory: string`: Filter tasks by pillar (`all`, `resume`, `skills`, `network`, `interview`, `applications`).
- **Key UI Components:**
  - Readiness Header: Overall calculated readiness score (e.g. 74%), streak counter (🔥 12-day streak), progress ring.
  - 5 Pillar Breakdown: Resume (90%), Skills (62%), Networking (55%), Interviews (78%), Applications (80%).
  - Interactive Checklist: Click to toggle completion with celebratory strikethrough, due dates, and priority indicators.

### 6. `/resume` (Resume Screener & Tailor)
- **File:** `src/app/resume/page.tsx`
- **State Variables:**
  - `activeTab: "analyse" | "tailor"`: Tab navigation.
  - `analysis: ResumeAnalysis | null`: Current ATS analysis results.
  - `loading: boolean`: Loading state.
  - `error: string | null`: Error state.
  - `expandedSuggestion: string | null`: ID of currently expanded suggestion accordion.
  - `appliedSuggestions: Set<string>`: Set of suggestion IDs applied to the resume preview.
  - `copiedId: string | null`: ID of suggestion copied to clipboard.
- **Key UI Components:**
  - **Analyse Tab:**
    - Dual score displays: JD Match Score (82%) and ATS Parsability Score (78%).
    - Strengths list & Gaps to address.
    - Keyword Analysis: Present (emerald) vs Missing (rose) keyword badges.
    - Target Role & Company card.
  - **Tailor Tab:**
    - AI Tailor Suggestions Accordion with Before/After diff comparison.
    - "Apply to Resume" toggle button which updates the live preview document.
    - Live Resume Preview pane with PDF export action (`window.print()`).

### 7. Layout Components
- **Sidebar** (`src/components/layout/Sidebar.tsx`):
  - State: `collapsed: boolean`, `profile: UserProfile | null`.
  - Displays logo, 6 main navigation links with active route highlighting, student avatar with initials, and collapse toggle.
- **Topbar** (`src/components/layout/Topbar.tsx`):
  - State: `mode: "demo" | "live"`, `profile: UserProfile | null`, `isAuthenticated: boolean`.
  - Dynamic page title & subtitle based on `usePathname()`, data mode indicator badge, search icon, notification bell, and student profile button.

---

## 8. Summary of Completion Status

| Module / Feature | Status | Implementation Details |
|:---|:---:|:---|
| **Project Foundation & Design System** | ✅ Complete | Next.js 16.4.2 App Router, Tailwind v4 dark glassmorphic design, custom UI components (`Card`, `Badge`, `Button`, `ProgressBar`, `StatCard`, `ErrorBanner`). |
| **Dual-Mode Engine (Demo / Live)** | ✅ Complete | Zero-config instant demo mode + Supabase live database sync with RLS and session proxying. |
| **Overview Dashboard (`/dashboard`)** | ✅ Complete | Real-time aggregate metric cards, readiness domain bars, upcoming interview timeline, recent activity log. |
| **Enhanced Job Discovery (`/jobs`)** | ✅ Complete | Full-featured 7-section filter sidebar, dual search with debounce, split-pane view, Gemini + heuristic match engine, live/demo API integration. |
| **Application Tracker (`/tracker`)** | ✅ Complete | 6-stage Kanban board with card progression, priority filtering, and search. |
| **Mock Interview Coach (`/interview`)** | ✅ Complete | Practice flashcards across 4 categories, hints, sample STAR answers, speech simulator timer, and session history logs. |
| **Placement Readiness Plan (`/readiness`)** | ✅ Complete | 5 pillar breakdown scores, overall readiness ring, interactive checklist with toggleable completion. |
| **Resume Screener & Tailor (`/resume`)** | ✅ Complete | Dual-tab ATS scan & AI Tailor mode with interactive suggestion accordions and live preview document. |
| **Backend API Endpoints** | ✅ Complete | `/api/jobs/search` (multi-source search) and `/api/jobs/match` (Gemini 2.0 Flash + heuristic scoring). |
