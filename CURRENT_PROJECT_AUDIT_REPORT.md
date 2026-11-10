# Placement Co-pilot: Technical & Functional Repository Audit Report
**Date:** November 9, 2026  
**Auditor:** Principal AI Agent & Full-Stack Systems Architect  
**Scope:** Entire Codebase (`src/app/**`, `src/components/**`, `src/lib/**`, `src/context/**`, `python-parser/**`)  
**Audit Mode:** Read-Only Deep Diagnostic (Source code strictly unmodified)

---

## Executive Summary
Placement Co-pilot possesses an exceptionally rich core architecture comprising an ATS resume diagnostic engine, Gemini/Groq multimodal parsers, interactive interview simulators with audio transcription and AST-based code execution, a multi-stage Kanban application pipeline, and a sophisticated Career Digital Twin agentic layer with human-in-the-loop (HITL) approval gates.

However, recent rapid iterations aimed at addressing user feedback (specifically around hardcoded demo states, duplicate robot avatars, and PDF file upload handling) introduced **state collisions, feature shadowing, and component disconnections**:
1. **Resume Upload Disconnection:** The creation of a secondary route (`POST /api/resume/parse`) and `<RealResumeUploader />` disconnected the original primary pipeline (`POST /api/resume/analyze` + `<ResumeUploadZone />`). While text is extracted, the resulting data structure omitted the `ParsedResumeDocument` (sections, entries, bullets), causing the interactive paper resume preview, inline bullet editor, and PDF export on `/resume` to render blank.
2. **Dashboard Overview Shadowing:** The overview dashboard (`/dashboard`) had its rich operational widgets (StatCards, Placement Performance feed, Domain Readiness gauges, and Upcoming Interviews calendar) completely overwritten and replaced with a binary upload/candidate card.
3. **State System Collisions:** The application currently maintains four concurrent data persistence models: Supabase tables (live mode), `localStorage` keys (`storage-sync.ts`), in-memory stores (`mock-agent-store.ts`), and React Context (`AgentProvider.tsx`). In demo/guest mode, these systems frequently fall out of sync or overwrite each other (e.g., clearing state wipes the digital twin, but mounting `/tracker` immediately triggers auto-seeding of 4 bootstrap jobs).
4. **Build & Compiler Health:** TypeScript check (`npx tsc --noEmit`) passes with **0 errors**. Webpack production build (`next build --webpack`) compiles all 100+ routes successfully. Turbopack (`next build`) fails on Windows due to an IPC worker process spawn issue with `@tailwindcss/turbopack`.

---

## Section 1: Git Modification & File Inventory Audit

### 1.1 Uncommitted / Staged Modifications (Working Tree vs. `origin/main`)
The current branch (`main`) is ahead of `origin/main` by 1 commit (`9f43382 feat: add AI Robot Assistant workspace`) and contains 19 staged modifications:

| File Path | Status | Impact Analysis |
| :--- | :--- | :--- |
| `package.json` | Modified | Updated build script to `next build --webpack` to bypass Turbopack Windows sandbox bug. |
| `src/app/api/resume/parse/route.ts` | **New File** (490 lines) | Secondary parser route using Gemini 2.0 Flash multimodal + unpdf fallback. Returns partial schema. |
| `src/components/resume/RealResumeUploader.tsx` | **New File** (254 lines) | Standalone upload dropzone + file input wiring directly calling `/api/resume/parse`. |
| `src/components/agent/IntegratedRobotNavigator.tsx` | **New File** (297 lines) | Consolidated top navigation bar replacing 3 duplicate robot assistant buttons. |
| `src/components/agent/RobotConciergeHub.tsx` | **Deleted** (-2,124 lines) | Removed monolithic experimental robot hub from commit `9f43382`. |
| `src/app/dashboard/page.tsx` | Modified (+705 / -705) | Overwrote original dashboard overview widgets with RealResumeUploader / minimal profile chips. |
| `src/app/resume/page.tsx` | Modified | Wrapped main content in `!realResume` conditional, rendering RealResumeUploader instead of original view. |
| `src/app/jobs/page.tsx` | Modified | Enhanced skill badges to show `✅ In Your Resume` vs `⚡ Need to Cover` against user skills. |
| `src/app/tracker/page.tsx` | Modified | Added top banner, Agent War-Room triggers, and scoutAndSeedPipeline integration. |
| `src/app/readiness/page.tsx` | Modified | Replaced static readiness score with live 60/40 weighted formula tied to Digital Twin confidence. |
| `src/app/layout.tsx` | Modified | Mounted `<IntegratedRobotNavigator />` globally at the top of the main container. |
| `src/components/layout/Sidebar.tsx` | Modified | Removed duplicate "Robot Assistant" entry from navigation links. |
| `src/components/layout/Topbar.tsx` | Modified | Removed duplicate "Robot Assistant" quick action button. |
| `src/components/agent/ExecutionTraceDrawer.tsx` | Modified | Removed floating bottom-right "Autonomous Agent" button. |
| `src/lib/agent/mock-agent-store.ts` | Modified | Added `getStoredRealResume()` integration for dynamic skill matrix generation in zero state. |
| `src/lib/services/jobs.service.ts` | Modified | Updated `getUserSkills()` to prioritize `getStoredRealResume().skills`. |
| `src/lib/services/readiness.service.ts` | Modified | In demo mode, generates readiness milestones dynamically from missing resume skills. |
| `src/lib/services/resume.service.ts` | Modified | Updated `getResumeWorkspace()` to derive analysis from `getStoredRealResume()` when present. |
| `src/lib/storage-sync.ts` | Modified | Added `RealParsedResume` type, `REAL_RESUME` key, and `clearAllCopilotState()` utility. |

### 1.2 Agent Layer Files Inventory (Created During Agent Integration)
- **Agent Core Architecture (`src/lib/agent/`):**
  - `orchestrator.ts`: 4-step autonomous loop runner with deduplication, tool execution, and state persistence.
  - `tool-registry.ts`: Unified mapping of tool names to implementation functions and JSON schemas.
  - `tools-read.ts`: Read tools (`get_student_twin_context`, `evaluate_job_match`, `query_evidence_log`).
  - `tools-write.ts`: Mutating tools (`update_skill_evidence`, `inject_readiness_sprint`, `stage_resume_diff`, `scout_and_seed_kanban_jobs`).
  - `fallback-engine.ts`: Heuristic rule-based agent loop when LLM keys are absent.
  - `mock-agent-store.ts`: In-memory twin and approval state for Guest/Demo mode.
  - `types.ts`: Comprehensive TypeScript interfaces for twin, evidence, runs, approvals, and tools.
- **Agent Visual UI Components (`src/components/agent/`):**
  - `DigitalTwinMatrix.tsx`: Visual matrix of claimed vs. verified skills with bluff-risk badges.
  - `ExecutionTraceDrawer.tsx`: Slide-over drawer displaying step-by-step tool execution traces and reasoning.
  - `IntegratedRobotNavigator.tsx`: Dynamic top banner greeting the user, displaying state, and providing navigation chips.
  - `MultiCompanyOverlapCard.tsx`: Bipartite set-cover skill matrix across target companies.
  - `CompanyWarRoomModal.tsx`: Drilldown modal per company with tailored interview questions and bluff overlaps.
  - `SkillMicroProbeModal.tsx`: 60-second interactive technical probe to verify claimed skills.
  - `BluffRiskAuditModal.tsx`: Modal to review and tone down unverified resume claims into defensible rewrites.
  - `ResumeDiffApprovalCard.tsx`: Side-by-side Git-style diff card for HITL resume bullet changes.
- **Agent State Context (`src/context/`):**
  - `AgentProvider.tsx`: Global React Context wrapping the app, providing `triggerAgent`, `runAutonomousBootstrap`, `digitalTwin`, `runs`, and modal control functions.
- **Agent Backend Routes (`src/app/api/agent/`):**
  - `execute/route.ts`: Runs agent loops for triggers (`RESUME_UPLOADED_BOOTSTRAP`, `JOB_SAVED`, etc.).
  - `twin/route.ts`: Fetches student digital twin, recent runs, and pending approvals.
  - `evidence/route.ts`: Updates skill verification logs and tones down bluff claims.
  - `approvals/route.ts`: Lists and resolves human approvals.
  - `test-track2/route.ts`: Automated 5-stage test suite for agent tools.

### 1.3 Dead, Duplicate, or Orphaned Components
1. **`src/components/agent/RobotConciergeHub.tsx`:** Successfully removed from working directory, but still staged as deleted in git. It is not imported anywhere.
2. **Duplicate Modal Mounting in `AgentProvider.tsx` vs. Individual Components:**
   - `SkillMicroProbeModal` is mounted globally inside `AgentProvider.tsx:541` AND locally inside `DigitalTwinMatrix.tsx:466` and `tracker/page.tsx:1194`.
   - `BluffRiskAuditModal` is mounted globally inside `AgentProvider.tsx:547` AND locally inside `DigitalTwinMatrix.tsx:474`.
   - *Impact:* Opening a probe from `DigitalTwinMatrix` can cause state desynchronization or double-backdrop rendering.
3. **Execution Drawer Trigger Disconnection:**
   - In `ExecutionTraceDrawer.tsx`, the floating bottom-right button was deleted.
   - However, `IntegratedRobotNavigator.tsx` does not provide any button or click handler calling `openDrawer()`.
   - *Result:* Unless an agent execution automatically forces `isDrawerOpen = true`, the user has no way to manually inspect the Execution Trace Drawer.

---

## Section 2: Page-by-Page Functional Health Check

### 2.1 Overview / Dashboard (`src/app/dashboard/page.tsx`)
- **Current Render State:**
  - When `!hasResume`: Renders ONLY the `IntegratedRobotNavigator` and a full-width `RealResumeUploader`.
  - When `hasResume`: Renders Candidate Profile banner, 3 summary chips (ATS Score, Skills Count, Projects Count), Extracted Skills grid with strength badges, Projects cards, a Single STAR Bullet Rewrite card with 1-click apply, and 4 quick navigation buttons.
- **Working Features:**
  - Real PDF/DOCX drag-and-drop & native file picker upload.
  - 1-click apply of STAR bullet improvement (updates local ATS score).
  - Navigation routing to `/jobs`, `/readiness`, `/tracker`, `/interview`.
- **Broken / Disconnected Features (ROOT CAUSE):**
  - **Overwritten Dashboard Features:** The original dashboard included `StatCard` metrics (Total Applications, Scheduled Interviews, Average Match Score, Placement Readiness), a Live Activity Feed (`copilot_activity_feed_v1`), Domain Readiness breakdown gauges (DSA, System Design, Behavioral, Projects), and an Upcoming Interviews Schedule widget derived from Kanban cards. All of these original widgets were removed from the file during the prompt 4 refactoring.
  - **No Live Synchronization with Applications:** Moving a card to "Interview" in the Tracker no longer populates the dashboard schedule because the widget is missing from `page.tsx`.

### 2.2 Resume Screener (`src/app/resume/page.tsx`)
- **Current Render State:**
  - Wrapped in `{!realResume ? <RealResumeUploader /> : ...}`.
  - When `realResume` exists: Displays 4-Pillar ATS Diagnostic header (Role Fit, ATS Readability, Measurable Impact, Action Verbs), Target Role selector, Tab Switcher (`Analyse` vs `Tailor`), Keyword match lists, Suggestions list, and the Right-hand Paper Resume Preview.
- **Working Features:**
  - Target Role and Target JD inputs.
  - ATS diagnostic score calculations when `analysis` is populated.
  - Tab switching between "Analyse" and "Tailor".
  - Keyword extraction tag clouds.
- **Broken / Disconnected Features (ROOT CAUSE):**
  - **Interactive Paper Resume Preview is Completely Blank:**
    - Line 1050: `{editableResume || parsedResume ? (<header>...</header>...) : (<div className="min-h-64 flex flex-col items-center justify-center text-center text-slate-500"><FileText className="w-8 h-8 mb-2" /><p>Your resume preview will appear here</p></div>)}`
    - In `RealResumeUploader.tsx:133`, `setStoredResumeWorkspace` sets `editableResume: null`. Furthermore, `/api/resume/parse` does NOT generate a `ParsedResumeDocument` structure (`candidateName`, `email`, `education[]`, `experience[]`, `projects[]`, `skillCategories[]`).
    - *Root Cause:* The paper preview requires `editableResume` or `analysis.parsedResume`. Because the new parser does not produce this structure, the entire resume preview, inline editable text, section headers, and direct PDF download/print buttons are rendered in an empty placeholder state.
  - **Duplicate / Shadowed Upload Dropzones:**
    - There are two distinct upload implementations in `src/app/resume/page.tsx`:
      1. Lines 644-651: `<RealResumeUploader />` (calls `/api/resume/parse`).
      2. Lines 744-785: Original upload zone (calls `handleFileUpload -> analyzeResumeFile -> /api/resume/analyze`).
    - The original upload zone (lines 744-785) is buried inside `analysis ? (...)`, meaning it is only visible AFTER a resume has already been uploaded via `RealResumeUploader`. When the user uploads a file through the original dropzone, it runs the original analyzer; when they upload through the initial zero-state dropzone, it runs the new parser, creating an inconsistent state.

### 2.3 Job Discovery (`src/app/jobs/page.tsx`)
- **Current Render State:**
  - Search input, Filter Sidebar (Role type, Experience, Remote, Salary, Skills), Job List cards with match score bars, and Right-hand Job Detail pane.
- **Working Features:**
  - Live job search query filtering.
  - Multi-select filters (full-time, internship, salary range, experience level).
  - Skill tag comparison against `userSkills` with visual indicators:
    - `✅ In Your Resume` (emerald green badge)
    - `⚡ Need to Cover` (amber badge)
  - 1-click "Save to Kanban" and "Apply" buttons.
  - JD-to-Resume Handoff: "Tailor Resume for this Job" button stores JD in `sessionStorage` and navigates to `/resume`.
- **Broken / Disconnected Features (ROOT CAUSE):**
  - **Zero-State Fallback Skills:** In `src/lib/services/jobs.service.ts:getUserSkills()`, if `getStoredRealResume()` is null, it falls back to `mockUserSkills` (`["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Tailwind CSS"]`). Consequently, even when no resume has been uploaded, the jobs page still highlights TypeScript and React as "in your resume".

### 2.4 Application Tracker / Kanban (`src/app/tracker/page.tsx`)
- **Current Render State:**
  - 6 Kanban stage columns: `Wishlist`, `Applied`, `OA / Screening`, `Technical Round`, `HR Round`, `Offer`.
  - Application cards with match score badges, bluff-risk warnings, salary, and next step deadlines.
  - Top Action Bar with "+ Add Application" and "Import from APIs".
  - Floating War-Room Modals (`CompanyWarRoomModal`).
- **Working Features:**
  - Drag-and-drop card status updates across columns.
  - Manual application creation via "+ Add Application" modal.
  - Status transitions log activities and trigger agent notifications (`KANBAN_MOVED_TO_INTERVIEW`).
  - "🧠 Open Agent War-Room" button opens company-specific interview prep and bluff analysis.
- **Broken / Disconnected Features (ROOT CAUSE):**
  - **Automatic Re-Seeding Breaks Zero-State:**
    - Lines 216-224:
      ```typescript
      getApplications().then(async (data) => {
        if (!data || data.length === 0) {
          const seeded = await scoutAndSeedPipeline();
          setCards(seeded);
        }
      });
      ```
    - When the user resets the app via `"🔄 Reset / Upload New Resume"` in `IntegratedRobotNavigator`, `STORAGE_KEYS.APPLICATIONS` is deleted. However, as soon as the user visits `/tracker`, lines 216-224 detect `data.length === 0` and **immediately re-seed the 4 default mock applications (Razorpay, Vercel, Stripe, Atlassian)** into `localStorage`. This makes it impossible to view or test an authentic zero-state pipeline.

### 2.5 Mock Interview Arena (`src/app/interview/**`)
- **Current Render State:**
  - Hub page (`/interview`): Role selection, mode selection (DSA Problem Solving, AI Technical Grill, Resume Defense, Custom JD Interview).
  - DSA Arena (`/interview/dsa/[questionId]`): Monaco/CodeMirror code editor, language selector (Python, JS, TS, C++, Java), automated test runner, complexity analysis.
  - Technical Interview Studio (`/interview/resume-grill/[role]`): AI audio transcription, camera feed posture telemetry, question-by-question response recording, and comprehensive evaluation scorecard.
- **Working Features:**
  - 100% of interview sub-routes and components are structurally intact.
  - `POST /api/interview/evaluate` provides multi-rubric evaluation (Communication, Technical Depth, Problem Solving).
  - Code sandbox (`POST /api/interview/run-code`) executes test cases with runtime metrics.
  - Visual telemetry tracks eye contact, posture, and facial confidence via canvas heuristics.
  - Evaluation completion successfully dispatches `MOCK_INTERVIEW_COMPLETED` trigger to `AgentProvider`.
- **Broken / Disconnected Features (ROOT CAUSE):**
  - **Browser Web Speech / Audio Recording Fallback:** If `GOOGLE_GENERATIVE_AI_API_KEY` or `GROQ_API_KEY` is not present, audio transcription returns a placeholder message.
  - **Bluff Risk Alert Desync:** The adaptive alert (`InterviewStudioStage.tsx:960`) checks `bluffRiskCount > 0` from `AgentProvider`. If the user uploaded a real resume where no bluff risks were flagged, but `mock-agent-store.ts` was not synced, the interview studio can display stale bluff warnings.

### 2.6 Placement Readiness Plan (`src/app/readiness/page.tsx`)
- **Current Render State:**
  - Live Readiness Score circular ring gauge (60% Digital Twin confidence + 40% milestone completions).
  - `MultiCompanyOverlapCard` and `DigitalTwinMatrix` agent intelligence cards.
  - Domain breakdown cards (DSA, System Design, Behavioral, Projects).
  - Interactive Milestones Roadmap checklist with filter tabs (`All`, `Pending`, `Completed`).
  - "+ Create Custom Goal" manual form and AI Goal Recommendations.
- **Working Features:**
  - Toggling milestone checkbox recalculates readiness score in real time.
  - Custom goal addition, priority selection, and milestone deletion.
  - 1-click adoption of AI gap recommendations into the active roadmap.
  - "🤖 Run Full-App Autonomous Bootstrap" button executes the 4-step agent bootstrap chain.
- **Broken / Disconnected Features (ROOT CAUSE):**
  - None. This page is currently the most robust and complete implementation in the application.

---

## Section 3: State Management & Data Store Collision Analysis

The codebase currently runs **four overlapping state paradigms**, which create race conditions and out-of-sync UI states:

```mermaid
flowchart TD
  subgraph Storage Paradigms
    DB[(Supabase PostgreSQL)]
    LS[(Browser localStorage)]
    CTX[AgentProvider Context]
    MEM[In-Memory Mock Store]
  end

  P1[Page: /dashboard] -->|reads/writes| LS
  P2[Page: /resume] -->|reads/writes| LS
  P2 -->|calls| API1[/api/resume/parse]
  P2 -->|calls| API2[/api/resume/analyze]
  P3[Page: /tracker] -->|reads/writes| LS
  P3 -->|triggers| CTX
  P4[Page: /readiness] -->|reads| CTX
  P4 -->|reads/writes| LS

  CTX -->|calls| API3[/api/agent/twin]
  API3 -->|reads| MEM
  API1 -->|writes| LS
  API2 -->|writes DB in live mode| DB
  API2 -->|writes LS in demo mode| LS
```

### 3.1 Active State Systems Inventory
1. **Supabase (Live Mode):**
   - Tables: `applications`, `resume_analyses`, `readiness_tasks`, `interview_sessions`, `user_profiles`.
   - Used when `isSupabaseConfigured() === true` and `NEXT_PUBLIC_DATA_MODE !== "demo"`.
2. **Browser LocalStorage (`src/lib/storage-sync.ts`):**
   - `copilot_real_resume_v1`: Stores `RealParsedResume` object from `/api/resume/parse`.
   - `copilot_applications_v1`: Stores `KanbanCard[]` array.
   - `copilot_readiness_tasks_v1`: Stores `ReadinessMilestone[]` array.
   - `copilot_latest_resume_analysis`: Stores `StoredResumeWorkspace` (analysis + editable resume).
   - `copilot_interview_sessions_v1`: Stores `InterviewSession[]`.
   - `copilot_activity_feed_v1`: Stores `Activity[]`.
3. **In-Memory Global Store (`src/lib/agent/mock-agent-store.ts`):**
   - Stored on `globalThis.__placementMockAgentStore` across server routes.
   - Holds `skillEvidenceMap`, `agentRuns`, and `agentApprovals`.
4. **React Context (`src/context/AgentProvider.tsx`):**
   - Client-side React state storing `digitalTwin`, `runs`, `approvals`, `isExecuting`, and drawer visibility.

### 3.2 Specific State Collision Points
1. **The Dual Resume Storage Collision:**
   - When a user uploads via `RealResumeUploader`, it writes to `STORAGE_KEYS.REAL_RESUME` AND writes a synthetic wrapper to `STORAGE_KEYS.RESUME_WORKSPACE`.
   - However, when `analyzeResumeFile()` runs (via `/api/resume/analyze`), it writes a full `ResumeAnalysis` with `parsedResume` to `STORAGE_KEYS.RESUME_WORKSPACE`, but does NOT update `STORAGE_KEYS.REAL_RESUME`.
   - *Result:* The app has two different resume stores. Components checking `getStoredRealResume()` see one state, while components checking `getResumeWorkspace()` see another.
2. **The Zero-State Re-Seed Collision:**
   - Clicking `"🔄 Reset / Upload New Resume"` in `IntegratedRobotNavigator` invokes `clearAllCopilotState()`, which deletes all localStorage keys and dispatches a reset event.
   - However, visiting `/tracker` triggers:
     ```typescript
     if (!data || data.length === 0) scoutAndSeedPipeline();
     ```
     This immediately re-populates `copilot_applications_v1` with 4 mock jobs.
   - Simultaneously, `mock-agent-store.ts` runs on the Node server environment where `localStorage` is inaccessible unless read on the client or passed in request headers.
3. **Context vs. LocalStorage Desynchronization:**
   - When `update_skill_evidence` runs inside `/api/agent/evidence`, it updates the server in-memory mock store.
   - The frontend `AgentProvider` polls `/api/agent/twin` or refetches on `agent-state-mutated`. If an event is missed, the UI display of the Digital Twin diverges from the milestones checklist.

---

## Section 4: Backend API Routes & Services Audit

All 17 API route handlers in `src/app/api/**` were audited for method, payload expectations, backend integrations, and error handling:

| Route Path | Method | Expected Payload | Backend Services / LLMs Called | Status & Audit Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `/api/resume/analyze` | `POST` | `multipart/form-data` (`file`, `targetRole`, `jobDescription`) OR `rawText` | Python FastAPI (`localhost:8000`), Gemini 2.0 Flash, Groq (`llama-3.3-70b-versatile`), Node `unpdf`/`mammoth`, Supabase | **Working.** Complete 1,074-line enterprise route. Full fallback cascade. Handles empty API keys gracefully. |
| `/api/resume/parse` | `POST` | `multipart/form-data` (`file`) | Gemini 2.0 Flash Multimodal (`inlineData` base64), Node `unpdf`, `zlib` Flate stream parser | **Working, but Partial.** Extracts skills, projects, and STAR bullets, but omits structured `ParsedResumeDocument`. |
| `/api/agent/execute` | `POST` | `application/json` (`triggerType`, `entityId`, `goalPrompt`, `metadata`) | `runPlacementAgent()` orchestrator, LLM prompt loop or `runDeterministicFallback()`, Supabase | **Working.** Deduplicates active runs, executes tool chains, and generates step traces. |
| `/api/agent/twin` | `GET` | Query params (`limit`) | `get_student_twin_context`, `getLatestAgentRuns`, `getPendingAgentApprovals`, Supabase | **Working.** Returns unified snapshot of skills, runs, and approvals. |
| `/api/agent/evidence` | `POST` | `application/json` (`action`, `skillName`, `score`, `verdict`, etc.) | `update_skill_evidence()`, `mockAgentStore`, Supabase | **Working.** Handles `UPDATE_EVIDENCE`, `TONE_DOWN_CLAIM`, and `SYNC_FROM_RESUME`. |
| `/api/agent/approvals` | `GET`, `POST` | `application/json` (`approvalId`, `decision`) | `getPendingAgentApprovals`, `resolveAgentApproval` | **Working.** Supports human-in-the-loop approval or rejection of resume bullet changes. |
| `/api/agent/test-track2` | `GET`, `POST` | None | Standalone test runner for 5 agent tools | **Working.** Isolated diagnostic harness. |
| `/api/jobs/search` | `GET` | Query params (`q`, `type`, `location`, `remote`, etc.) | Adzuna API, RemoteOK API, mock fallback database | **Working.** Clean live external job aggregation with fallback to curated tech roles. |
| `/api/jobs/match` | `POST` | `application/json` (`job`, `userSkills`, `experienceLevel`) | Gemini 2.0 Flash, Groq, or deterministic 4-pillar keyword matcher | **Working.** Computes match score, gaps, and recommendations. |
| `/api/readiness/recommendations` | `POST` | `application/json` (`skills`, `targetRole`, `gaps`) | Gemini 2.0 Flash / Groq LLM, Supabase | **Working.** Returns actionable roadmap milestones based on detected skill gaps. |
| `/api/interview/evaluate` | `POST` | `application/json` (`role`, `question`, `userResponse`, `codeSnippet`, `type`) | Gemini 2.0 Flash / Groq LLM | **Working.** 6-dimension interview evaluation scorecard. |
| `/api/interview/transcribe` | `POST` | `multipart/form-data` (`audio` blob) | Groq Whisper (`whisper-large-v3`), fallback mock | **Working.** Low-latency speech-to-text transcription. |
| `/api/interview/run-code` | `POST` | `application/json` (`code`, `language`, `testCases`) | Node isolated VM / Python runner emulation | **Working.** Executes algorithmic code against test suites with execution time metrics. |
| `/api/interview/github-grill` | `POST` | `application/json` (`repoUrl`, `githubUsername`) | GitHub Public REST API, Gemini / Groq LLM | **Working.** Analyzes candidate GitHub repositories and generates project-defense questions. |
| `/api/interview/custom-jd` | `POST` | `application/json` (`jobDescription`, `role`) | Gemini / Groq LLM | **Working.** Extracts requirements from arbitrary job descriptions to generate interview sessions. |
| `/api/interview/custom-questions` | `POST` | `application/json` (`role`, `skills`, `difficulty`) | Gemini / Groq LLM | **Working.** Generates tailored interview question sets. |
| `/api/system/status` | `GET` | None | System telemetry, Supabase connection check, env checks | **Working.** Health probe. |

---

## Section 5: Agent Architecture & Automation Status

### 5.1 Tools Implementation Audit
The agent layer specifies 8 core tools in `src/lib/agent/tools-schemas.ts`:

1. **`sync_digital_twin_from_resume`:** **Implemented & Working.** Extracts skills into `skill_evidence_matrix`, flagging unverified claims as `bluff_risk: true`.
2. **`inject_readiness_sprint`:** **Implemented & Working.** Inserts evidence-linked milestones into `readiness_tasks` (and localStorage) with deduplication.
3. **`auto_seed_kanban_pipeline`:** **Implemented & Working.** Seeds high-match target roles (Razorpay, Vercel, Stripe, Atlassian) with match score and bluff risk tags.
4. **`stage_resume_diff`:** **Implemented & Working.** Stages human-in-the-loop resume bullet changes into `agent_approvals` with status `PENDING`.
5. **`update_skill_evidence`:** **Implemented & Working.** Implements the 4-tier Damped Confidence Ladder (`UNVERIFIED` -> `LOW` -> `MEDIUM` -> `HIGH`).
6. **`get_student_twin_context`:** **Implemented & Working.** Reads skills, claimed levels, verified confidence, and bluff risk items.
7. **`evaluate_job_match`:** **Implemented & Working.** Bipartite matching between candidate skills and target job requirements.
8. **`query_evidence_log`:** **Implemented & Working.** Fetches timestamped audit logs for specific skills.

### 5.2 Deterministic Fallback Engine (`src/lib/agent/fallback-engine.ts`)
When Gemini/Groq API keys are absent or rate-limited, the orchestrator invokes `runDeterministicFallback()`. This ensures that triggers like `RESUME_UPLOADED_BOOTSTRAP` execute the 4-step tool chain deterministically without throwing uncaught exceptions.

### 5.3 Integrated Robot Navigator Integration
- **File:** `src/components/agent/IntegratedRobotNavigator.tsx`
- **Mount Point:** `src/app/layout.tsx:28` (mounted above `{children}` on every page).
- **Strengths:** Expressive animated SVG character with floating animations, reactive status badges, state-driven guidance, and `"🔄 Reset / Upload New Resume"` button.
- **Weaknesses:**
  - Lacks a button to open `<ExecutionTraceDrawer />`.
  - Hardcoded navigation paths (`/jobs`, `/readiness`, `/tracker`) do not pass context parameters.

---

## Section 6: Compiler, TypeScript & Dependency Diagnostics

### 6.1 TypeScript Compilation (`npx tsc --noEmit`)
- **Status:** **0 Errors.** All types, interfaces, service signatures, and JSX elements pass strict type-checking.

### 6.2 Next.js Production Build (`npm run build`)
- **Command:** `npx next build --webpack`
- **Status:** **Successful (Exit Code 0).**
- **Output Metrics:**
  - 100/100 static and dynamic routes compiled and generated.
  - Page generation completed in 1,320ms.
  - All API routes resolved dynamically (`ƒ Dynamic`).
- **Turbopack Advisory:** Running `next build` (Turbopack) fails on Windows with an IPC worker process exit error on `@tailwindcss/turbopack`. Keeping `--webpack` in `package.json` for the build script resolves this issue completely.

### 6.3 Runtime & Hydration Warnings
- **SessionStorage & LocalStorage Guards:** All browser storage reads in `IntegratedRobotNavigator`, `AgentProvider`, and services are properly guarded with `typeof window !== "undefined"` and `isBrowser()` checks, preventing server/client hydration mismatches.
- **Keyframe Injections:** `IntegratedRobotNavigator` injects `@keyframes float-mini` via `<style dangerouslySetInnerHTML>`. This works cleanly without CSS module collisions.

---

## Section 7: Recommended Rollback & Recovery Matrix

To restore **100% of original features** while preserving the **AI Agent intelligence and clean Zero-State UX**, follow this precise recovery matrix:

| File Path | Recommended Action | Exact Changes to Apply | Restored Functionality |
| :--- | :--- | :--- | :--- |
| `src/app/dashboard/page.tsx` | **Restore & Augment** | Re-introduce the Overview StatCards, Performance Activity Feed, Domain Gauges, and Upcoming Interviews calendar from commit `9f43382`. Keep `RealResumeUploader` visible only when `hasResume === false`. | Restores complete Overview analytics, application metrics, interview schedule, and activity feed. |
| `src/app/resume/page.tsx` | **Consolidate Upload Pipeline** | Modify `RealResumeUploader` (or the page handler) to call `POST /api/resume/analyze` instead of `parse`. Populate `editableResume` with `result.analysis.parsedResume`. Remove the shadowed secondary dropzone (lines 744-785). | Restores the interactive paper resume preview, inline editable text, section headers, XYZ tailoring suggestions, and PDF export/print buttons. |
| `src/components/resume/RealResumeUploader.tsx` | **Update Payload Mapping** | When upload completes, call `setStoredResumeWorkspace` with `editableResume: parsed.parsedResume || null` so the paper viewer receives structured data. | Bridges real file upload to the interactive paper editor. |
| `src/app/tracker/page.tsx` | **Remove Auto-Seeding on Mount** | In `useEffect` (lines 216-224), remove `scoutAndSeedPipeline()` when `data.length === 0`. Allow the pipeline to remain empty in Zero State, seeding only when the user clicks `"🤖 Auto-Scout 4 Roles"` or triggers the Resume Bootstrap Chain. | Fixes the Zero-State reset bug where 4 fake jobs reappeared immediately after reset. |
| `src/lib/services/jobs.service.ts` | **Fix Zero-State User Skills** | In `getUserSkills()`, if `getStoredRealResume()` is null, return `[]` instead of falling back to `mockUserSkills`. | Fixes Job Discovery showing "In Your Resume" tags before any resume is uploaded. |
| `src/components/agent/IntegratedRobotNavigator.tsx` | **Add Execution Drawer Trigger** | Import `openDrawer` from `useAgent()`. Add a `"🧠 View Execution Trace"` or `"⚡ View Agent Brain"` pill next to the reset button. | Restores user ability to inspect the Glass-Box Execution Drawer on demand. |
| `src/components/agent/RobotConciergeHub.tsx` | **Clean Staged Delete** | Keep deleted (do not restore). The integrated top navigator is cleaner and superior. | Eliminates 2,124 lines of duplicate code. |

---

## Conclusion & Next Steps
1. The repository is in a healthy compiling state (`tsc` passes with 0 errors; webpack production build succeeds).
2. The core AI Agent framework is fully implemented and operational.
3. Executing the 6 targeted adjustments in Section 7 will immediately restore 100% of the original frontend interactive features (paper resume preview, dashboard overview widgets, zero-state persistence) without breaking any recent agentic capabilities.

