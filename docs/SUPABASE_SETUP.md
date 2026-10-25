# Placement Co-pilot: Supabase Setup & Architecture Guide

This guide details how to configure Supabase authentication, database schema, and Row Level Security (RLS) for **Placement Co-pilot** (Phase 2).

---

## 1. Prerequisites & Project Creation

1. Create a Supabase project at [database.new](https://database.new).
2. Note your **Project URL** and **Publishable / Anon Key** from **Project Settings > API**.

---

## 2. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the credentials:

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...

# Data Mode: "demo" (mock data fallback) or "live" (persistent Supabase)
NEXT_PUBLIC_DATA_MODE=live
```

> **Note on Demo Mode:**  
> When `NEXT_PUBLIC_SUPABASE_URL` is empty or retains placeholder values, the application automatically boots into **Demo Mode**. All pages and features remain functional with pre-populated demo data.

---

## 3. Database Schema & Migrations

The database migration is located at:
`supabase/migrations/20261021000000_initial_schema.sql`

### Tables Created:
1. `profiles`: Student details tied to `auth.users(id)` with automatic provisioning trigger (`handle_new_user`).
2. `resumes`: User resume metadata and parsed text with cascade deletion on user removal.
3. `resume_analyses`: ATS scores, match percentages, suggestions, and keyword breakdowns.
4. `job_listings`: Shared discovery catalog with public read access.
5. `applications`: Kanban application tracker stages (`Wishlist`, `Applied`, `Phone Screen`, `Interview`, `Offer`, `Rejected`).
6. `interview_sessions`: Completed and ongoing mock interview sessions.
7. `interview_turns`: Child table storing questions, user answers, and AI feedback.
8. `weak_topics`: Target areas flagged for follow-up revision.
9. `readiness_tasks`: Milestone roadmap items with completion toggling.
10. `reminders`: Schedule alerts and deadlines.

### Applying Migrations:

#### Option A: Supabase CLI (Recommended)
```bash
# Link project
supabase link --project-ref <your-project-ref>

# Push migrations to remote database
supabase db push
```

#### Option B: Supabase Dashboard SQL Editor
1. Open your Supabase Dashboard.
2. Navigate to **SQL Editor**.
3. Paste the contents of `supabase/migrations/20261021000000_initial_schema.sql` and click **Run**.

---

## 4. Row Level Security (RLS) & Child Table Authorization

All tables have RLS enabled with strict user isolation:

### User Isolation:
```sql
-- Profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Applications
CREATE POLICY "Users can manage their own applications"
  ON public.applications FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Child Table Security (`interview_turns`):
The child table `interview_turns` does not store a redundant `user_id`; its authorization is strictly enforced through parent session ownership:
```sql
CREATE POLICY "Users can view turns for own sessions"
  ON public.interview_turns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = interview_turns.session_id AND s.user_id = auth.uid()
    )
  );
```

### Trigger Security:
The `handle_new_user()` trigger on `auth.users` uses `SECURITY DEFINER` with an explicit `SET search_path = public` to prevent search path hijacking attacks:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$ ... $$
```

---

## 5. Verification & Testing Procedures

### A. RLS Isolation Verification
Run this SQL snippet in the Supabase SQL editor using different simulated user contexts:

```sql
-- 1. Simulate User A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

-- Create session for User A
INSERT INTO interview_sessions (id, user_id, role, score)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'SWE', 85);

-- Insert child turn for User A's session (SHOULD SUCCEED)
INSERT INTO interview_turns (session_id, question_text, turn_order)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'What is React concurrency?', 1);

-- 2. Simulate User B
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

-- Query child turns (MUST RETURN 0 ROWS for User B)
SELECT * FROM interview_turns WHERE session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Attempt insert child turn into User A's session as User B (MUST FAIL WITH RLS VIOLATION)
INSERT INTO interview_turns (session_id, question_text, turn_order)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Malicious turn injection', 2);
```

---

## 6. Architecture & Next.js 16 Proxy Convention

1. **Proxy Convention (`src/proxy.ts`)**:
   - Next.js 16 introduces `src/proxy.ts` exporting a named `proxy` function.
   - Refreshes auth sessions via `updateSession()` in `src/lib/supabase/proxy.ts`.
   - Client redirects are optimistic; true enforcement happens via server claims and RLS.

2. **Data-Access Layer (`src/lib/services/`)**:
   - All page components consume typed services (`applications.service.ts`, `jobs.service.ts`, etc.).
   - Explicit failure handling: if live Supabase mode is active and a query fails, an honest error banner is rendered. No silent fallback to mock data occurs during live database failures.
