import type { InterviewCategory, InterviewQuestion } from "@/types";
import type { StudioQuestion } from "@/components/interview/interview-common";

export interface RoleInterviewQuestion extends InterviewQuestion {
  level: 1 | 2 | 3;
  isAiEscalated?: boolean;
}

interface BaselineSeed {
  level: 1 | 2 | 3;
  category: InterviewCategory;
  question: string;
  hint: string;
  whyAskThis: string;
  sampleAnswer: string;
  keyConceptsToCover: string[];
}

function buildRoleQuestions(prefix: string, roleTitle: string, seeds: BaselineSeed[]): RoleInterviewQuestion[] {
  return seeds.map((s, idx) => ({
    id: `${prefix}-l${s.level}-${idx + 1}`,
    role: roleTitle,
    category: s.category,
    difficulty: s.level === 1 ? "easy" : s.level === 2 ? "medium" : "hard",
    level: s.level,
    isAiEscalated: false,
    question: s.question,
    hint: s.hint,
    whyAskThis: s.whyAskThis,
    sampleAnswer: s.sampleAnswer,
    keyConceptsToCover: s.keyConceptsToCover,
    followUps: [],
  }));
}

const ROLE_SEEDS: Record<string, BaselineSeed[]> = {
  "Full-Stack SDE": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Walk me through the end-to-end request lifecycle in a full-stack project you built—from browser click to database write and UI re-render. Where did you place validation and error boundaries?",
      hint: "Trace DNS/TLS, client state, API route/middleware validation (e.g., Zod), DB transaction boundaries, and optimistic vs server-confirmed UI updates.",
      whyAskThis: "Verifies foundational understanding of full-stack boundaries, schema validation, and failure propagation.",
      sampleAnswer:
        "In my project, form submissions validate client-side via Zod, hit an authenticated POST route handler wrapped in a PostgreSQL transaction, return typed errors on 4xx/5xx, and update React state cleanly.",
      keyConceptsToCover: ["Schema Validation", "HTTP Status Handling", "DB Transaction", "Error Boundaries"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "How did you handle authentication and authorization across both client components and backend API routes? Why isn't hiding a UI button sufficient?",
      hint: "Distinguish AuthN (JWT/session cookies) from AuthZ (RBAC/RLS per endpoint) and CSRF/XSS protections via HttpOnly cookies.",
      whyAskThis: "Tests basic web security hygiene and server-side enforcement discipline.",
      sampleAnswer:
        "We stored short-lived session tokens in HttpOnly SameSite cookies verified in server middleware, and enforced row-level ownership checks in every SQL query rather than trusting client IDs.",
      keyConceptsToCover: ["HttpOnly Cookies", "Server-Side AuthZ", "CSRF/XSS", "Row Ownership Checks"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "Explain a slow page or API endpoint you debugged in a project. How did you measure the bottleneck before writing a fix?",
      hint: "Mention Network waterfall, Core Web Vitals, SQL EXPLAIN ANALYZE, N+1 queries, or React Profiler.",
      whyAskThis: "Separates candidates who profile systematically from those who guess randomly.",
      sampleAnswer:
        "Chrome DevTools showed a 1.8s API waterfall caused by an N+1 query loop in our ORM; switching to a single joined query with a composite index dropped p95 latency below 90ms.",
      keyConceptsToCover: ["Profiling Metrics", "N+1 Query Elimination", "Indexing", "Before/After Latency"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "In your primary project, how would you prevent duplicate database mutations when a mobile user double-taps 'Submit' on flaky 3G networks?",
      hint: "Discuss idempotency keys, Redis/Postgres uniqueness constraints, client button locking, and safe retry backoff.",
      whyAskThis: "Tests production defensive engineering across network boundaries.",
      sampleAnswer:
        "Generate a deterministic UUID idempotency key per user intent, enforce a unique index on (user_id, idempotency_key) in Postgres, and replay the original stored response on duplicate retries.",
      keyConceptsToCover: ["Idempotency Keys", "Unique Constraint", "Retry Semantics", "Race Condition Safety"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Suppose you cache user-specific data in Redis or CDN edge cache. Walk through your exact cache-invalidation strategy when underlying Postgres rows mutate.",
      hint: "Compare write-through, cache-aside + TTL + explicit key eviction, stale-while-revalidate, and thundering herd protection.",
      whyAskThis: "Evaluates real-world caching trade-offs and stale-data mitigation.",
      sampleAnswer:
        "Use cache-aside with a bounded TTL and publish synchronous key deletion after commit, guarded by singleflight/request coalescing to stop cache stampedes on hot keys.",
      keyConceptsToCover: ["Cache-Aside & Eviction", "Stale Read Window", "Thundering Herd", "Commit Ordering"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "Tell me about a gnarly SSR/hydration mismatch or state-sync bug between React state and your backend. How did you isolate root cause cleanly?",
      hint: "Point to non-deterministic renders (Date.now/window), stale closure hooks, race conditions in useEffect without AbortController.",
      whyAskThis: "Probes real debugging ownership on modern React/Next.js stacks.",
      sampleAnswer:
        "Rapid filter typing triggered out-of-order fetch resolutions overwriting newer results; adding AbortController cleanup per query effect and moving initial timestamps server-side fixed both issues.",
      keyConceptsToCover: ["Race Condition / AbortController", "Hydration Determinism", "Root Cause Analysis"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "When choosing between REST, GraphQL, or tRPC/Server Actions for an internal vs public dashboard, what concrete trade-offs drove your project's API contract?",
      hint: "Mention over/under-fetching, HTTP caching, schema coupling across deploy versions, and rate-limiting granularity.",
      whyAskThis: "Assesses pragmatic architectural decision-making over resume buzzwords.",
      sampleAnswer:
        "REST with Zod contracts gave us clean HTTP status semantics and CDN cacheability for read-heavy routes, avoiding GraphQL N+1 complexity where a monorepo shared TS types.",
      keyConceptsToCover: ["Over/Under-fetching", "HTTP Caching", "Type Safety vs Coupling", "Versioning"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Design zero-downtime database schema migrations for a live table receiving 5,000 writes/sec when splitting one column into a normalized child table.",
      hint: "Walk through Expand-and-Contract: add nullable column/table, dual-write, chunked backfill with throttling, shadow read verification, switch reads, drop legacy column.",
      whyAskThis: "Staff-level operational readiness check on high-throughput full-stack deployments.",
      sampleAnswer:
        "Follow Expand-and-Contract across 4 deploys: add new table, deploy dual-writes, backfill historical rows in throttled batches without locking, validate parity on read shadow, then switch traffic and clean up.",
      keyConceptsToCover: ["Expand-and-Contract", "Dual-Write", "Lock-Free Backfill", "Rollback Safety"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Your full-stack app uses third-party webhooks (Stripe/GitHub) that can arrive out of order, duplicate, or lag by 10 minutes. Architect guaranteed state consistency.",
      hint: "Cover HMAC signature verification, raw payload intake queue, sequence/version monotonicity checks, and dead-letter queues.",
      whyAskThis: "Tests distributed event-driven state machines and webhook security.",
      sampleAnswer:
        "Verify HMAC signature, enqueue raw event immediately and return 200 OK within 200ms, process workers idempotently checking event.created >= row.last_event_ts inside a row lock, and route failures to a DLQ.",
      keyConceptsToCover: ["HMAC Verification", "Out-of-Order Monotonicity", "Async Ingestion Queue", "DLQ"],
    },
    {
      level: 3,
      category: "debugging",
      question:
        "After a traffic spike, connection pool exhaustion cascades into 504 timeouts across unrelated microservices. How do you contain the blast radius right now and long-term?",
      hint: "Discuss circuit breakers, bounded timeouts, bulkheads, PgBouncer transaction pooling, load shedding, and backpressure.",
      whyAskThis: "Bar-raiser reliability engineering scenario testing graceful degradation under failure.",
      sampleAnswer:
        "Immediately shed non-critical traffic at the API gateway and shorten upstream timeouts; long-term introduce PgBouncer pooling, bulkhead worker pools per tenant, and circuit breakers.",
      keyConceptsToCover: ["Connection Pool Exhaustion", "Circuit Breakers & Bulkheads", "Load Shedding", "Bounded Timeouts"],
    },
  ],

  "Frontend Developer": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Explain the browser Critical Rendering Path and what happens between receiving HTML bytes and painting pixels. How do CSS and JS block rendering differently?",
      hint: "Cover DOM, CSSOM, Render Tree, Layout/Reflow, Paint, Composite, plus defer/async script loading.",
      whyAskThis: "Validates core browser fundamentals beneath framework abstractions.",
      sampleAnswer:
        "HTML parses into DOM while CSS blocks render-tree construction; synchronous script tags block HTML parsing unless marked defer/async. Modifying transform/opacity runs on the compositor, avoiding costly layout reflows.",
      keyConceptsToCover: ["DOM & CSSOM", "Render-Blocking Resources", "Reflow vs Composite", "async vs defer"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "In a React project you built, when does a component re-render and why can careless `useEffect` or inline object props degrade frame rates?",
      hint: "Discuss referential equality, reconciliation, state colocation, memoization trade-offs, and stale dependencies.",
      whyAskThis: "Checks everyday React mental model before advanced performance tuning.",
      sampleAnswer:
        "Re-renders trigger on parent renders, state updates, or context changes. Keeping state colocated in leaf components prevents broad tree re-renders better than wrapping everything blindly in React.memo.",
      keyConceptsToCover: ["Reconciliation", "Referential Equality", "State Colocation", "useEffect Pitfalls"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "How do you design accessible (a11y) interactive widgets—like custom dropdowns, modals, or toast alerts—without breaking keyboard navigation?",
      hint: "Cover focus traps, Escape-to-close, aria-live regions, semantic HTML elements first, and focus restoration.",
      whyAskThis: "Tests production UI craftsmanship beyond happy-path mouse clicks.",
      sampleAnswer:
        "Start with native button/dialog semantics, trap Tab focus inside open modals, restore trigger focus on close, and announce async feedback through polite aria-live regions.",
      keyConceptsToCover: ["Semantic HTML", "Focus Trap & Restoration", "ARIA Attributes", "Keyboard Support"],
    },
    {
      level: 2,
      category: "technical",
      question:
        "You inherit a dashboard lagging badly during rapid typing and rendering a 15,000-row table. Walk through how you profile and optimize it step by step.",
      hint: "Cover React Profiler flamegraphs, list virtualization (TanStack Virtual), startTransition/deferred values, and debouncing.",
      whyAskThis: "Evaluates practical UI latency profiling and virtualization strategy.",
      sampleAnswer:
        "Use React Profiler and Chrome Performance tab to confirm DOM node count and main-thread long tasks; virtualize table rows so only ~30 visible DOM nodes mount, and wrap filter updates in useDeferredValue.",
      keyConceptsToCover: ["React Profiler / Flamegraph", "Windowing / Virtualization", "useDeferredValue / Transition", "DOM Node Budget"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "How do you architect client-side server-state caching vs local UI state (e.g., TanStack Query + optimistic updates with rollback on API failure)?",
      hint: "Differentiate ephemeral UI state from asynchronous server cache, cache invalidation keys, onMutate snapshots, and rollback on error.",
      whyAskThis: "Separates senior frontend architecture from Redux/useState sprawl.",
      sampleAnswer:
        "Keep UI-only toggles local and manage API data via query keys with staleTime; optimistic mutations snapshot prior cache state in onMutate and restore it atomically if the network call rejects.",
      keyConceptsToCover: ["Server vs UI State", "Optimistic UI & Rollback", "Query Invalidation", "Deduplication"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "Explain Core Web Vitals (LCP, INP, CLS) in concrete terms: name one common cause and fix for each in your own frontend project.",
      hint: "LCP: hero image preload/SSR; INP: chunking main-thread work >50ms; CLS: explicit width/height/skeleton reservations.",
      whyAskThis: "Links UI implementation choices directly to user-perceived performance.",
      sampleAnswer:
        "Fix LCP by preloading the hero asset and SSR-rendering above-the-fold text; fix INP by offloading heavy parsing to a Web Worker; eliminate CLS by reserving explicit aspect-ratio boxes.",
      keyConceptsToCover: ["LCP Optimization", "INP Main-Thread Budget", "CLS Layout Reservation"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "Users report an intermittent memory leak after leaving your single-page app open for 4 hours. How do you capture a heap snapshot and identify retained objects?",
      hint: "Use Chrome Memory tab 3-snapshot technique, look for detached DOM nodes, uncleaned WebSocket/IntersectionObserver listeners, and closures.",
      whyAskThis: "Tests browser memory profiling under real long-lived SPA conditions.",
      sampleAnswer:
        "Take Heap Snapshots before, during, and after route navigation (Comparison view), filter for Detached HTMLDivElements, and trace Retainers back to uncleaned global listeners or timers.",
      keyConceptsToCover: ["Heap Snapshot Comparison", "Detached DOM Nodes", "Listener Cleanup", "Closures"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Design a real-time collaborative canvas / rich-text editor supporting offline edits and multi-tab sync at 60fps without server round-trip jitter.",
      hint: "Discuss CRDTs vs OT, IndexedDB local persistence, BroadcastChannel multi-tab lock, delta batching, and canvas/GPU offscreen rendering.",
      whyAskThis: "Staff frontend system design balancing local-first sync and rendering frame budgets.",
      sampleAnswer:
        "Maintain local state in memory backed by IndexedDB and synced across tabs via BroadcastChannel, apply CRDT updates deterministically on reconnect, and decouple pointer input from batched WebSocket frames.",
      keyConceptsToCover: ["CRDT vs OT", "Offline IndexedDB", "Multi-Tab Sync", "60fps Frame Budget"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Your bundle size grew to 2.4MB and Next.js hydration blocks interaction on mid-tier Android phones. Architect an aggressive bundle & rendering diet.",
      hint: "Cover Bundle Analyzer, Server Components keeping heavy parsers server-only, dynamic imports, barrel-file tree-shaking fixes, and selective hydration.",
      whyAskThis: "Probes deep bundler/RSC engineering beyond generic lazy-loading answers.",
      sampleAnswer:
        "Audit chunks with Webpack/Turbopack analyzer, move markdown/date/validation dependencies exclusively into Server Components, remove barrel re-exports breaking tree-shaking, and stream non-critical panels via Suspense.",
      keyConceptsToCover: ["Tree Shaking / Barrel Files", "RSC Server-Only Code", "Streaming Suspense", "Parse/Compile Budget"],
    },
    {
      level: 3,
      category: "technical",
      question:
        "Explain XSS, CSRF, and Content-Security-Policy (CSP) nonce architectures in a micro-frontend or rich HTML-rendering app.",
      hint: "Compare DOMPurify sanitization vs Trusted Types, strict CSP with per-request nonces, removing unsafe-inline, and cookie/token isolation.",
      whyAskThis: "Senior browser security mastery check.",
      sampleAnswer:
        "Sanitize untrusted HTML with DOMPurify and enforce Trusted Types; lock script execution via per-request cryptographic CSP nonces while storing auth tokens strictly in HttpOnly SameSite cookies.",
      keyConceptsToCover: ["Strict CSP Nonces", "XSS / DOMPurify", "SameSite CSRF Defense", "Token Storage"],
    },
  ],

  "Backend Engineer": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Explain how PostgreSQL (or your preferred RDBMS) executes an indexed lookup vs a sequential scan. When can adding more indexes actually hurt your system?",
      hint: "Cover B-Tree traversal, write amplification on INSERT/UPDATE, index bloat, memory pressure, and low-cardinality column selectivity.",
      whyAskThis: "Tests foundational database storage internals and index trade-offs.",
      sampleAnswer:
        "B-Trees allow O(log N) lookup by avoiding full heap scans, but every INSERT/UPDATE must maintain every secondary index, increasing WAL volume and write latency while consuming shared buffers.",
      keyConceptsToCover: ["B-Tree Lookup", "Write Amplification", "Selectivity / Cardinality", "EXPLAIN ANALYZE"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "What is the difference between Read Committed, Repeatable Read, and Serializable isolation levels? Give a concrete anomaly prevented by moving up a tier.",
      hint: "Cover dirty reads, non-repeatable reads, phantom reads, lost updates, SELECT FOR UPDATE, and optimistic version columns.",
      whyAskThis: "Ensures candidate avoids silent money/inventory race conditions.",
      sampleAnswer:
        "Under Read Committed, two concurrent debits reading balance=100 can both pass validation (lost update); Repeatable Read or SELECT FOR UPDATE / atomic conditional UPDATE prevents double-spending.",
      keyConceptsToCover: ["Isolation Levels", "Lost Update / Phantom Read", "Pessimistic vs Optimistic Locking"],
    },
    {
      level: 1,
      category: "system-design",
      question:
        "Contrast synchronous HTTP API calls vs asynchronous background job queues in a backend service you built. Where do you draw the boundary?",
      hint: "Discuss p99 user wait time, retryability, backpressure, external API failures (email/PDF/AI), and correlation IDs.",
      whyAskThis: "Evaluates fundamental decoupling between user request paths and slow workers.",
      sampleAnswer:
        "Validation and primary commit happen synchronously so users get immediate confirmation; heavy PDF/AI/email steps publish to an async worker queue with exponential backoff retries and trace IDs.",
      keyConceptsToCover: ["Request Latency SLA", "Async Decoupling", "Retry & Idempotency", "Observability"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Design a distributed Rate Limiter in front of your public APIs supporting 100k req/s per region. Which algorithm and Redis primitive do you pick and why?",
      hint: "Compare Token Bucket, Sliding Window Log, Sliding Window Counter; discuss atomic Redis Lua scripts and failure-mode policy (fail-open vs fail-closed).",
      whyAskThis: "Classic production backend craft probing atomicity and Redis failure modes.",
      sampleAnswer:
        "Use Sliding Window Counter or Token Bucket executed inside an atomic Redis Lua script to prevent check-then-set races, keyed per tenant with fail-open fallback for non-billing routes.",
      keyConceptsToCover: ["Token Bucket / Sliding Window", "Atomic Lua Script", "Race Conditions", "Fail-Open vs Fail-Closed"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "Your backend service exhibits sawtooth CPU and periodic 3-second latency spikes every 15 minutes even under steady traffic. Walk through your diagnosis.",
      hint: "Suspect Stop-the-World GC pauses, cron/batch job bursts, cache TTL stampedes, or lock contention; trace via pprof/flamegraphs and pool metrics.",
      whyAskThis: "Assesses systematic production diagnostics beyond reading app logs.",
      sampleAnswer:
        "Correlate spike timestamps with GC telemetry, cron schedules, and PgBouncer wait-queue metrics; jitter uniform cache TTLs if synchronized expiration triggers periodic DB stampedes.",
      keyConceptsToCover: ["Latency Telemetry", "GC / Batch Spikes", "Jittered TTL", "Lock Contention"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Explain the Transactional Outbox Pattern. Why isn't writing to Postgres and publishing to Kafka/SQS inside one `try/catch` block atomic?",
      hint: "Dual-write problem: DB commits then broker call fails (lost event) OR broker publishes then DB rolls back (phantom event). CDC / polling outbox fixes it.",
      whyAskThis: "Tests distributed data consistency between databases and event buses.",
      sampleAnswer:
        "A DB transaction cannot atomically wrap a network call to Kafka; writing the event into an `outbox` table in the exact same DB transaction and tailing it via Debezium CDC guarantees at-least-once delivery.",
      keyConceptsToCover: ["Dual-Write Failure", "Transactional Outbox", "CDC / Debezium", "Idempotent Consumers"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "How do database connection pools work (PgBouncer / HikariCP), and why does setting pool size to 500 per pod collapse your database during autoscaling?",
      hint: "Postgres forks ~10MB OS process per connection and thrashes on context-switching/locking; keep app pools tiny and terminate at transaction pooler.",
      whyAskThis: "Directly separates hobby APIs from scalable microservice backends.",
      sampleAnswer:
        "50 pods x 500 connections = 25,000 backend connections exhausting Postgres RAM and CPU context switches; capping per-pod pool sizes behind PgBouncer in transaction-pooling mode stabilizes throughput.",
      keyConceptsToCover: ["Pool Math & Scaling", "Transaction Pooling", "Context Switching", "Prepared Statements Caveat"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Architect a multi-region payment ledger requiring zero double-charges, strict auditability, and sub-200ms p99 writes despite cross-region network partitions.",
      hint: "Apply CAP theorem honestly: choose CP with Raft/leader routing per account shard, append-only double-entry ledger, idempotency keys, no float math.",
      whyAskThis: "Staff backend architecture challenge around correctness under partitions.",
      sampleAnswer:
        "Shard strongly-consistent Raft groups by merchant/account key so ledger writes remain single-leader consistent, enforce immutable double-entry rows in integer minor units, and preserve client idempotency keys.",
      keyConceptsToCover: ["CAP Consistency", "Double-Entry Append Ledger", "Consistent Hash Sharding", "Idempotency"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Design a distributed job scheduler executing 10 million delayed tasks/day with exact-once business effect and zero hot-shard bottlenecks.",
      hint: "Discuss time-bucketed partitions + consistent hashing, lease-based heartbeats/fencing tokens for split-brain prevention, and DLQ observability.",
      whyAskThis: "Tests distributed coordination, fencing tokens, and partitioned timing wheels.",
      sampleAnswer:
        "Partition scheduled timestamps into minute buckets across shards using virtual nodes, claim tasks with monotonic fencing tokens so stalled workers cannot commit stale mutations after lease expiry.",
      keyConceptsToCover: ["Time-Bucketed Sharding", "Lease & Fencing Tokens", "Split-Brain Safety", "Backpressure"],
    },
    {
      level: 3,
      category: "debugging",
      question:
        "Explain tail-latency amplification (`p99` fanning out across 15 microservice hops) and how hedged requests, adaptive concurrency limits, and deadlines mitigate it.",
      hint: "If 15 services each have 1% slow rate, 1 - 0.99^15 = 14% requests hit tail latency! Apply deadline propagation + hedged requests with budgets.",
      whyAskThis: "Principal-level distributed performance reasoning.",
      sampleAnswer:
        "Fan-out magnifies individual node tail latency exponentially; propagate remaining request deadlines via headers, use hedged requests capped at a 5% retry budget, and shed load via AIMD concurrency limits.",
      keyConceptsToCover: ["Fan-Out Tail Math", "Deadline Propagation", "Hedged Requests", "Adaptive Concurrency"],
    },
  ],

  "ML/Data Engineer": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Walk through an end-to-end ML or RAG pipeline you built. How did you prevent train/test data leakage and ensure offline validation reflected production?",
      hint: "Cover temporal splits vs random splits, fitting scalers/tokenizers strictly on train folds, target leakage, and holdout sets.",
      whyAskThis: "Verifies core scientific rigor in data/ML feature engineering.",
      sampleAnswer:
        "Split records chronologically rather than randomly, compute normalization statistics and target encodings strictly inside training folds via pipeline transforms, and verify feature timestamps precede label events.",
      keyConceptsToCover: ["Data Leakage", "Temporal Splits", "Pipeline Transform Isolation", "Baseline Comparison"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "When choosing evaluation metrics for imbalanced fraud or churn classification (e.g., 1% positive class), why is Accuracy misleading, and what do you use instead?",
      hint: "Compare Precision-Recall AUC (PR-AUC), F-beta threshold tuning, ROC-AUC caveats, and cost-weighted confusion matrices.",
      whyAskThis: "Tests practical metric alignment to business risk.",
      sampleAnswer:
        "99% accuracy can be achieved by predicting all negatives; PR-AUC focuses on the minority positive class without drowning in true negatives, and threshold selection aligns with false-positive vs false-negative cost.",
      keyConceptsToCover: ["PR-AUC vs ROC-AUC", "Class Imbalance", "Threshold Cost Trade-off"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "In a vector search / RAG system, compare semantic chunking sizes, embedding latency, and why naive top-k cosine similarity often misses exact product SKUs or error codes.",
      hint: "Discuss hybrid retrieval (BM25 lexical + dense vector + RRF), metadata pre-filtering, cross-encoder reranking, and context window lost-in-the-middle.",
      whyAskThis: "Evaluates real production RAG competence beyond toy tutorials.",
      sampleAnswer:
        "Dense embeddings compress rare alphanumeric IDs poorly; combining BM25 keyword retrieval with dense embeddings via Reciprocal Rank Fusion and a lightweight cross-encoder reranker raises recall drastically.",
      keyConceptsToCover: ["Hybrid Search (BM25 + Dense)", "RRF Fusion", "Chunking Strategy", "Reranking"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "How do you prevent online-offline feature skew between batch Spark training pipelines and sub-20ms real-time inference serving?",
      hint: "Discuss unified feature stores (Feast/Tecton pattern), point-in-time joins (`ASOF`), parity logging, and deterministic feature transformations.",
      whyAskThis: "Core MLOps architecture question separating notebooks from production ML.",
      sampleAnswer:
        "Define transformation logic once, materialize historical snapshots using point-in-time ASOF joins for training, stream updates to a low-latency Redis online store, and shadow-log serving vectors to verify parity.",
      keyConceptsToCover: ["Feature Store Architecture", "Point-in-Time Joins", "Online-Offline Skew", "Parity Monitoring"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Your ETL pipeline ingests 500GB of Parquet logs daily via Airflow/Spark, and an upstream source re-emits duplicate or late-arriving partitions. Make the DAG idempotent.",
      hint: "Cover partitioned overwrites (`INSERT OVERWRITE`), deterministic deduplication by event_id + watermark, MERGE upserts, and schema evolution gates.",
      whyAskThis: "Tests production data engineering durability and backfill hygiene.",
      sampleAnswer:
        "Design DAG tasks partitioned by logical execution date rather than wall clock, overwrite or Delta MERGE target partitions deterministically, and validate schema contracts before downstream table swaps.",
      keyConceptsToCover: ["Idempotent Backfills", "Partition Overwrite / MERGE", "Watermarking", "Data Contracts"],
    },
    {
      level: 2,
      category: "technical",
      question:
        "Your fine-tuned model or LLM agent has 900ms p99 latency and high GPU cost. Walk through your concrete optimization levers without destroying accuracy.",
      hint: "Cover quantization (INT8/FP8/AWQ), KV-cache reuse, continuous batching (vLLM), semantic caching, and small-router / model distillation.",
      whyAskThis: "Probes inference systems optimization tradeoffs.",
      sampleAnswer:
        "Distill high-volume classifications onto a smaller quantized model, apply continuous batching with paged KV-cache (vLLM), cache deterministic embeddings/prompts, and route only ambiguous edge cases to large models.",
      keyConceptsToCover: ["Quantization", "Continuous Batching / KV Cache", "Semantic Caching", "Model Routing/Distillation"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "In Spark or PyTorch distributed jobs, one partition/worker sits at 99% progress for 40 minutes while 99 others finish in 2 minutes. Diagnose and fix the skew.",
      hint: "Data key skew (nulls/hot customer IDs); use salted keys, broadcast hash joins for small lookup tables, and AQE (Adaptive Query Execution).",
      whyAskThis: "Classic high-scale data/ML compute debugging problem.",
      sampleAnswer:
        "Inspect Spark UI task metrics for extreme shuffle read skew on null or hot keys; enable AQE skew join handling, broadcast small dimension tables, or salt hot join keys across partitions.",
      keyConceptsToCover: ["Shuffle Skew Diagnosis", "Key Salting", "Broadcast Joins", "AQE"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Design closed-loop Drift Detection & Automated Retraining when production ground-truth labels arrive delayed by 30 days (like credit default or conversions).",
      hint: "Separate covariate/feature drift (PSI/KS/embedding centroid shift) and prediction drift immediately from delayed label evaluation + canary shadow gating.",
      whyAskThis: "Staff ML systems design handling delayed feedback loops safely.",
      sampleAnswer:
        "Alert immediately on input feature PSI/Wasserstein drift and prediction confidence shifts while labels are pending; retrain on sliding validated cohorts and require shadow-traffic + slice parity checks before promoting weights.",
      keyConceptsToCover: ["Covariate vs Concept Drift", "Delayed Labels", "Slice Evaluation", "Shadow/Canary Gating"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Architect a multi-tenant AI evaluation and guardrail pipeline processing 5,000 LLM requests/sec with strict PII redaction and cost ceilings per tenant.",
      hint: "Async non-blocking guardrails vs synchronous pre-checks, lightweight ONNX PII classifier at edge, token-bucket token budgets, fallback routing.",
      whyAskThis: "High-scale LLM platform architecture testing latency vs safety budgets.",
      sampleAnswer:
        "Run fast local ONNX regex/NER PII redaction synchronously (<12ms), enforce Redis token/cost rate limits per tenant, stream async faithfulness/hallucination evals offline, and fail over gracefully across providers.",
      keyConceptsToCover: ["Low-Latency PII Guardrails", "Token Rate Limiting", "Async Eval Sampling", "Provider Failover"],
    },
    {
      level: 3,
      category: "technical",
      question:
        "Explain LoRA / QLoRA weight mechanics, why rank selection matters, and when full RAG + prompt engineering outperforms fine-tuning entirely.",
      hint: "Rank-decomposition low-rank adapters W + BA, frozen quantized base weights, style/format/domain adaptation vs dynamic factual knowledge.",
      whyAskThis: "Tests depth on modern foundation model adaptation decisions.",
      sampleAnswer:
        "LoRA freezes pretrained weights and trains low-rank delta matrices (B*A) reducing optimizer memory drastically; fine-tune for consistent output format or specialized syntax, but use RAG whenever facts change dynamically.",
      keyConceptsToCover: ["Low-Rank Adaptation", "Memory/Optimizer Savings", "RAG vs Fine-Tuning Boundary"],
    },
  ],

  "DevOps & Cloud Engineer": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Walk through how multi-stage Docker builds reduce image size and attack surface, and explain what happens at the Linux namespace/cgroup level when a container starts.",
      hint: "Separate build dependencies from distroless/alpine runtime layers; explain PID/net/mnt namespaces for isolation and cgroups for CPU/memory caps.",
      whyAskThis: "Verifies core container internals rather than just knowing CLI syntax.",
      sampleAnswer:
        "Multi-stage Dockerfiles compile binaries in a full SDK stage and copy only runtime artifacts onto a distroless image; Linux namespaces isolate process/network views while cgroups enforce hard RAM/CPU limits.",
      keyConceptsToCover: ["Multi-Stage Layers", "Distroless Security", "Linux Namespaces", "cgroups Resource Limits"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "Trace a Kubernetes `Deployment` rolling update: how do `readinessProbe`, `livenessProbe`, and `preStop` hooks prevent 502 errors during deploy?",
      hint: "Readiness gates Service Endpoints traffic; `preStop: sleep` handles async kube-proxy/ALB deregistration race; readiness != liveness (avoid cascading restarts).",
      whyAskThis: "Essential K8s zero-downtime lifecycle fluency.",
      sampleAnswer:
        "New pods only join Service endpoints after readinessProbe passes; on termination, a preStop sleep lets iptables/ALB drain in-flight connections before SIGTERM triggers graceful server shutdown.",
      keyConceptsToCover: ["Readiness vs Liveness", "preStop / Drain Race", "Graceful SIGTERM", "MaxUnavailable/Surge"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "How do you manage secrets (DB passwords, API keys) safely across CI/CD pipelines and Kubernetes clusters without committing plaintext to Git?",
      hint: "Compare OIDC short-lived federation (GitHub Actions -> AWS IAM), External Secrets Operator, KMS envelope encryption, and rotation.",
      whyAskThis: "Validates basic DevSecOps and credential hygiene.",
      sampleAnswer:
        "Authenticate CI via short-lived OIDC tokens instead of static IAM keys, sync cluster secrets dynamically via External Secrets Operator from AWS Secrets Manager/Vault, and enforce secret scanning pre-commit.",
      keyConceptsToCover: ["OIDC Short-Lived Auth", "External Secrets / Vault", "Zero Plaintext Git", "Rotation"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "How do you structure Terraform state, locking, and environment isolation (dev/staging/prod) for a multi-team cloud org so one apply cannot wipe production?",
      hint: "Remote encrypted state (S3 + DynamoDB lock / native lock), separated state files per blast-radius/env, least-privilege IAM roles, plan-on-PR.",
      whyAskThis: "Tests practical Infrastructure-as-Code safety boundaries.",
      sampleAnswer:
        "Split Terraform state per environment and domain rather than one monolith, enforce remote state locking, run read-only `terraform plan` on PRs, and scope prod applies strictly to protected CI runners.",
      keyConceptsToCover: ["State Isolation", "Remote Locking", "Blast-Radius Segmentation", "Least-Privilege CI"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "A Kubernetes microservice repeatedly hits `OOMKilled (Exit 137)` despite average cluster memory sitting at 45%. Walk through your exact investigation.",
      hint: "Container memory limit triggers cgroup OOM killer regardless of node free RAM; check JVM/Node heap flags (`--max-old-space-size`), Go GOMEMLIMIT, or memory leaks.",
      whyAskThis: "Common production container failure where node metrics mislead junior engineers.",
      sampleAnswer:
        "Node memory headroom is irrelevant once pod cgroup limits are exceeded; compare working-set RSS vs limits in Prometheus, tune runtime heap limits (Node/JVM) below cgroup ceiling, and capture heap profiles.",
      keyConceptsToCover: ["Exit 137 / cgroup OOM", "Runtime Heap Alignment", "Working Set Metrics", "Requests vs Limits"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Compare Blue-Green, Rolling, and Canary deployments with automated rollback. How do you handle backward-compatible database schemas during Canary?",
      hint: "Traffic shifting via Argo Rollouts / Envoy / ALB weights based on 5xx/latency error budget; expand-contract schemas because v1 and v2 run concurrently.",
      whyAskThis: "Connects deployment automation directly to stateful data safety.",
      sampleAnswer:
        "Shift 5% -> 25% -> 100% traffic via Argo Rollouts gated by Prometheus error-rate/p99 queries; require forward/backward-compatible DB schemas since both versions coexist during canary windows.",
      keyConceptsToCover: ["Canary Metric Gates", "Automated Rollback", "Backward-Compatible Schemas"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "Explain VPC networking for a private production workload: CIDR planning, private vs public subnets, NAT Gateway costs/SPOFs, and VPC endpoints.",
      hint: "Keep app/DB pods in private subnets across multi-AZs; avoid cross-AZ NAT egress fees to S3/ECR using Gateway/Interface VPC Endpoints.",
      whyAskThis: "Probes real cloud networking cost + security engineering.",
      sampleAnswer:
        "Place ALB/bastion in public subnets and compute/RDS strictly in multi-AZ private subnets; add S3/DynamoDB Gateway Endpoints and ECR Interface Endpoints to remove NAT bandwidth cost and single-AZ outage risk.",
      keyConceptsToCover: ["Public vs Private Subnets", "Multi-AZ Redundancy", "VPC Endpoints", "NAT Bottlenecks"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Architect a GitOps multi-cluster Kubernetes platform with automated image signing verification, supply-chain SBOMs, and zero-trust pod-to-pod mTLS.",
      hint: "Cover ArgoCD pull-based GitOps, Cosign + Kyverno admission policies, SLSA/SBOM CI attestation, Cilium/Istio mTLS, and NetworkPolicies.",
      whyAskThis: "Staff platform engineering integrating security into golden deployment paths.",
      sampleAnswer:
        "Sign container digests and SBOMs in CI via Sigstore Cosign, enforce Kyverno admission webhooks rejecting unsigned images, sync declaratively via ArgoCD, and enforce SPIFFE/Istio strict mTLS plus default-deny NetworkPolicies.",
      keyConceptsToCover: ["Pull GitOps", "Cosign Admission Gate", "Zero-Trust mTLS", "NetworkPolicies"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Your cloud bill doubled overnight due to cross-AZ Kubernetes traffic, over-provisioned NAT, and unthrottled observability logs. Execute a structural FinOps fix.",
      hint: "Topology-aware routing (`trafficDistribution`), log sampling/drop-filters before ingestion, Karpenter spot/right-sizing consolidation, S3 lifecycle tiers.",
      whyAskThis: "Tests cloud cost optimization without breaking reliability.",
      sampleAnswer:
        "Enable Kubernetes Topology Aware Routing to keep microservice calls same-AZ, aggregate and drop noisy INFO health logs at collector edge, and migrate stateless node pools onto Karpenter Spot/consolidation.",
      keyConceptsToCover: ["Cross-AZ Egress Reduction", "Collector Log Filtering", "Autoscaler Consolidation", "FinOps Unit Cost"],
    },
    {
      level: 3,
      category: "debugging",
      question:
        "Walk through an active DNS resolution timeout storm inside a busy EKS cluster (`conntrack` exhaustion / `ndots:5`). How do you mitigate without restarting prod?",
      hint: "Default K8s `ndots:5` turns every external domain into 4+ search-path lookups multiplying UDP DNS + Linux conntrack entries; deploy NodeLocal DNSCache and tune ndots:2.",
      whyAskThis: "Deep Linux/Kubernetes networking troubleshooting famous in high-scale prod clusters.",
      sampleAnswer:
        "Verify UDP conntrack saturation and CoreDNS QPS; add `ndots:2` + trailing dots where hot external hosts get queried, scale CoreDNS HPA, and roll out NodeLocal DNSCache over TCP.",
      keyConceptsToCover: ["ndots:5 Lookup Amplification", "conntrack Table Saturation", "NodeLocal DNSCache", "CoreDNS Scaling"],
    },
  ],

  "Cloud / SRE": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Define SLI, SLO, and Error Budget in concrete operational terms. How does a depleted error budget change your team's deployment velocity?",
      hint: "SLI = measured ratio (good requests / valid requests); SLO = target % over rolling window; budget exhaustion freezes feature launches until reliability work lands.",
      whyAskThis: "Core SRE contractual philosophy test.",
      sampleAnswer:
        "An SLI measures successful fast responses, an SLO commits to 99.9% over 28 days, leaving a 43-minute error budget; burning it freezes non-emergency feature rollouts in favor of stability fixes.",
      keyConceptsToCover: ["SLI vs SLO vs SLA", "Error Budget Policy", "Measurement Window"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "Contrast Metrics, Structured Logs, and Distributed Traces. Give a debugging example where logs alone fail without trace correlation or metrics.",
      hint: "Metrics tell you *what* degraded cheaply at scale; Traces pinpoint *which downstream span* stalled across hops; Logs inspect *exact context* via trace_id.",
      whyAskThis: "Validates observability pillar literacy.",
      sampleAnswer:
        "Metrics alert us checkout p99 jumped to 4s; filtering slow distributed traces via OpenTelemetry pinpoints the tax microservice span stalling; correlated logs via trace_id reveal a locked pool waiting on DNS.",
      keyConceptsToCover: ["Observability Pillars", "OpenTelemetry Correlation", "Cardinality Cost Control"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "During an active production SEV-1 outage, outline your Incident Command workflow from initial page through mitigation and blameless postmortem.",
      hint: "Restore service fast before root-causing (rollback first), designate Incident Commander vs Comms Lead, preserve timeline, write blameless RCA with concrete action items.",
      whyAskThis: "Checks calm, structured operational maturity under pager pressure.",
      sampleAnswer:
        "Acknowledge alert, appoint Incident Commander and Comms lead, mitigate immediately via recent-deploy rollback or feature flag, update status page every 15m, and publish blameless action-tracked RCA.",
      keyConceptsToCover: ["Mitigate Before Root Cause", "Incident Roles (IC/Comms)", "Blameless Postmortem"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Compare Multi-Window Multi-Burn-Rate SLO alerting vs static CPU > 80% alerts. Why do static threshold alerts burn out on-call engineers?",
      hint: "CPU=85% may serve users cleanly (noise) while 500s at low CPU go missed; multi-burn alerts catch fast acute breaks (1h/5m) and slow budget leaks (6h/30m).",
      whyAskThis: "Tests mature SRE alerting engineering.",
      sampleAnswer:
        "Alert only on user-facing symptom burn rates (e.g., consuming 2% monthly error budget within 1 hour + 5m confirmation) rather than noisy cause metrics like high CPU.",
      keyConceptsToCover: ["Symptom vs Cause Alerting", "Burn-Rate Math", "Alert Fatigue Reduction"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "An upstream microservice slows down from 20ms to 2s, and naive client retries trigger a 4x thundering-herd storm that takes down the whole platform. How do you break retry storms?",
      hint: "Cover exponential backoff + full jitter, retry budgets (token bucket limiting retries to <=10%), server-side `Retry-After` / load shedding, and circuit breakers.",
      whyAskThis: "Classic distributed systems amplification failure scenario.",
      sampleAnswer:
        "Enforce capped exponential backoff with full jitter on clients, apply per-client retry budgets so retries never exceed ~10% extra traffic, and trip circuit breakers + load shedding under overload.",
      keyConceptsToCover: ["Retry Amplification", "Exponential Backoff + Jitter", "Retry Budgets", "Load Shedding"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Differentiate RPO vs RTO cleanly. Walk through testing real Disaster Recovery (DR) backups without discovering on outage day that snapshots fail to restore.",
      hint: "RPO = acceptable data loss window; RTO = recovery duration; automated periodic restore drills into isolated sandbox + checksum verification.",
      whyAskThis: "Separates paper DR plans from battle-tested continuity.",
      sampleAnswer:
        "An untested backup isn't a backup: run weekly automated restore drills rebuilding Postgres + KMS keys into an ephemeral VPC, validating row counts and synthetic traffic well within target RTO/RPO.",
      keyConceptsToCover: ["RPO vs RTO", "Automated Restore Drills", "Dependency Order / KMS Keys"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "When troubleshooting Linux host bottlenecks during an outage, walk through your 60-second USE Method (Utilization, Saturation, Errors) command triage.",
      hint: "Mention CPU runqueue (`uptime`/`mpstat`/`vmstat`), memory page faults/OOM (`free`/`dmesg`), disk I/O wait (`iostat`), and socket drops (`ss`/`netstat`).",
      whyAskThis: "Tests grounded systems-level Linux fluency under production pressure.",
      sampleAnswer:
        "Run uptime/vmstat for CPU runqueue saturation, dmesg -T for OOM/kernel drops, iostat -xz for disk await saturation, free -m for slab/page pressure, and ss -s for TCP syn/listen overflows.",
      keyConceptsToCover: ["USE Method", "CPU Runqueue / IOwait", "dmesg OOM / Socket Drops"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Architect Active-Active Multi-Region failover (`RTO < 30s`, regional control-plane blackhole tolerant) — what breaks with DNS TTL caching and cross-region DB replication lag?",
      hint: "DNS caching lags regardless of TTL=30s -> Anycast/BGP global L4 routing; cell-based isolation prevents bad config pushes corrupting every region simultaneously; fence split-brain DB promotion.",
      whyAskThis: "Staff/Principal multi-region reliability trade-offs.",
      sampleAnswer:
        "Avoid relying solely on DNS failover; front cell-isolated regional stacks behind Global Anycast Load Balancing, push configs through staggered cell waves, and handle asynchronous read-replica lag safely during region drains.",
      keyConceptsToCover: ["Cell-Based Architecture", "Anycast vs DNS Caching", "Control-Plane Independence", "Replication Lag Safety"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Design safe Chaos Engineering / GameDay automation in production so fault injection validates resilience without accidentally creating a real SEV-1 outage.",
      hint: "Define steady-state hypothesis first, bound blast radius (single canary cell/1% synthetic header), automatic abort triggers on SLO burn, kill switch.",
      whyAskThis: "Probes disciplined resilience engineering vs reckless breaking things.",
      sampleAnswer:
        "Isolate fault injection to a minimal blast radius (canary pod or synthetic traffic subset) governed by automated safety triggers that abort the experiment instantly if real user SLO metrics budge.",
      keyConceptsToCover: ["Steady-State Hypothesis", "Blast Radius Bounding", "Automated Abort Kill Switch"],
    },
    {
      level: 3,
      category: "debugging",
      question:
        "Walk through diagnosing a silent BGP/NAT/security-group gray failure where synthetic probes report 100% green externally, yet 15% of live customer POST requests drop silently.",
      hint: "Cover MTU/PMTU blackholing on large POST payloads vs tiny GET `/healthz` probes, half-broken AZ load balancer target health, and asymmetric routing.",
      whyAskThis: "Bar-raiser gray-failure diagnostic problem common at hyperscale.",
      sampleAnswer:
        "Small GET health checks bypass MTU blackholes and deep app locks: segment failure rate by AZ, ISP, and payload size (`tracepath`/tcpdump), inspect asymmetric security group states, and replace shallow `/healthz` with deep regional telemetry.",
      keyConceptsToCover: ["Gray Failure Isolation", "Deep vs Shallow Health Checks", "PMTU / Asymmetric Routing", "Per-AZ Telemetry"],
    },
  ],

  "Data Analyst": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Write and explain how SQL window functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, running totals with `OVER`) differ from `GROUP BY` aggregations.",
      hint: "GROUP BY collapses rows to group granularity; Window functions preserve original row grain while computing peer/partition metrics.",
      whyAskThis: "Tests essential analytical SQL mastery.",
      sampleAnswer:
        "GROUP BY collapses rows per key, whereas window functions compute top-N rankings or moving 7-day sums across partitions (`PARTITION BY user_id ORDER BY dt`) without losing row-level detail.",
      keyConceptsToCover: ["Window Partitioning", "RANK vs DENSE_RANK vs ROW_NUMBER", "Row Granularity Preservation"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "Explain how an `INNER JOIN`, `LEFT JOIN`, and `NULL` comparisons inside a `WHERE` clause vs `ON` clause behave differently on funnel datasets.",
      hint: "Filtering the right table inside `WHERE` silently converts a `LEFT JOIN` into an `INNER JOIN`, dropping unmatched users!",
      whyAskThis: "Catches the #1 silent analyst SQL bug distorting conversion metrics.",
      sampleAnswer:
        "Placing `right.status = 'paid'` inside WHERE strips NULL unmatched rows, quietly changing a LEFT JOIN into an INNER JOIN and inflating measured conversion rate; put optional table filters inside `ON`.",
      keyConceptsToCover: ["LEFT JOIN + WHERE Trap", "NULL Semantics", "Metric Distortion"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "Walk through an analytics dashboard or insight you built: how did you pick North Star vs guardrail metrics rather than drowning stakeholders in 30 charts?",
      hint: "Pair primary conversion/retention metric with inverse quality guardrails (latency, refund rate, support tickets) so growth doesn't game the funnel.",
      whyAskThis: "Assesses product sense and executive storytelling.",
      sampleAnswer:
        "Anchored on 7-day activated retention paired with churn/refund guardrails, replacing vanity raw signup counts with cohort-normalized action funnels.",
      keyConceptsToCover: ["North Star & Guardrails", "Vanity vs Actionable Metrics", "Stakeholder Framing"],
    },
    {
      level: 2,
      category: "technical",
      question:
        "You run an A/B test on checkout conversion and see +4% uplift on day 2 with p=0.04. Why shouldn't you stop the test early and ship immediately?",
      hint: "Cover peeking problem (inflated Type I error), novelty effect, day-of-week seasonality cycles, Minimum Detectable Effect / fixed sample horizon, and SRM checks.",
      whyAskThis: "Critical experimentation statistics rigor.",
      sampleAnswer:
        "Stopping mid-experiment whenever p<0.05 inflates false-positive rates massively; wait for pre-calculated sample power spanning full weekly cycles, and verify Sample Ratio Mismatch (SRM) before trusting results.",
      keyConceptsToCover: ["Peeking / Alpha Inflation", "Sample Power & Weekly Cycle", "SRM Validation", "Novelty Effect"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "Finance's reported monthly revenue differs by 8% from Product Analytics' Mixpanel/Amplitude dashboard. How do you reconcile both numbers cleanly?",
      hint: "Inspect timezone cutoffs (UTC vs local), refunds/chargebacks timing, bot/internal test traffic, join fan-outs duplicating order rows, and attribution definitions.",
      whyAskThis: "Real-world messy data reconciliation problem.",
      sampleAnswer:
        "Trace grain parity first (check duplicate order rows from many-to-many joins), standardize UTC timestamps and refund accounting rules, filter internal QA IDs, and verify client tracking drops vs payment webhooks.",
      keyConceptsToCover: ["Join Fan-Out / Grain Mismatch", "Timezone & Refund Alignment", "Client Dropoff vs Ledger"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Design a user retention cohort query (D1, D7, D30 retention) cleanly without expensive self-joins on a 500M-row events table.",
      hint: "Deduplicate `(user_id, activity_date)` per day first, derive `signup_date` per user, join once or use array/bitmap aggregation.",
      whyAskThis: "Tests scalable warehouse SQL design (BigQuery/Snowflake).",
      sampleAnswer:
        "Pre-aggregate active events down to distinct `(user_id, active_day)` before computing date diffs from first_seen, partition by event_date and cluster by user_id to prune scanned bytes.",
      keyConceptsToCover: ["Pre-Aggregation", "Partition Pruning", "Cohort Retention Math"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "Explain Simpson's Paradox with a real product example: why can overall conversion drop even while conversion improves inside BOTH mobile and desktop segments?",
      hint: "Traffic mix shift between high-converting desktop and lower-converting mobile shifts the weighted average despite per-segment gains.",
      whyAskThis: "Verifies multi-dimensional analytical reasoning.",
      sampleAnswer:
        "If mobile share surges from 40% to 75% (with lower baseline conversion than desktop), blended total conversion drops even though both mobile and desktop improved independently.",
      keyConceptsToCover: ["Mix-Shift Confounding", "Weighted Aggregation", "Segmented Diagnosis"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Model a Star Schema (Fact + Slowly Changing Dimension Type 2) in dbt/warehouse for subscription billing upgrades and downgrades over time.",
      hint: "Explain `valid_from`/`valid_to`/`is_current` on `dim_subscription_plan`, immutable `fact_invoices` linking point-in-time plan keys, and idempotent incremental builds.",
      whyAskThis: "Senior analytics engineering data modeling check.",
      sampleAnswer:
        "Maintain SCD Type 2 `dim_account_plan` rows tracking effective date ranges via dbt snapshots so historical revenue facts join accurately to the tier active at invoice timestamp.",
      keyConceptsToCover: ["Star Schema", "SCD Type 2 History", "Point-in-Time Attribution"],
    },
    {
      level: 3,
      category: "technical",
      question:
        "When randomized A/B testing is impossible (e.g., B2B enterprise rollout or network marketplace spillover), how do you estimate causal impact?",
      hint: "Discuss Difference-in-Differences (parallel trends check), Switchback experiments for marketplace interference, Synthetic Controls, and Propensity Score Matching caveats.",
      whyAskThis: "Principal analytical causal-inference fluency.",
      sampleAnswer:
        "Use Difference-in-Differences with synthetic matched control cohorts after verifying pre-treatment parallel trends, or run geo/time switchback randomization where user-level spillover invalidates standard A/B splits.",
      keyConceptsToCover: ["Difference-in-Differences", "Switchback / Spillover", "Synthetic Controls / Confounders"],
    },
    {
      level: 3,
      category: "debugging",
      question:
        "Your company's executive BI dashboard takes 45 seconds per load and consumes 40% of Snowflake/BigQuery spend. Architect a 10x speedup and cost drop.",
      hint: "Materialized rollups / dbt incremental models, partition + cluster alignment on dashboard filters, BI result caching, eliminating `SELECT *` and skewed regex CTEs.",
      whyAskThis: "Tests practical analytics performance engineering.",
      sampleAnswer:
        "Replace full-table raw scans with daily/hourly clustered summary marts in dbt incremental models, align partition keys to date slicers, and cache common executive filters.",
      keyConceptsToCover: ["Summary Rollup Marts", "Partition/Cluster Pruning", "Incremental Processing"],
    },
  ],

  "Mobile App Developer": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Compare the UI main thread vs background threads on iOS/Android/React Native. What freezes scroll at 60/120fps and how do you avoid jank?",
      hint: "Each frame has 16.6ms (60Hz) or 8.3ms (120Hz); JSON parsing, image decoding, disk I/O, or RN bridge serialization on UI thread drops frames.",
      whyAskThis: "Core mobile runtime fluency.",
      sampleAnswer:
        "Keep layout/render strictly on the UI thread within an 8–16ms budget; offload heavy JSON parsing, SQLite writes, and image decoding to background dispatch queues / JSI worklets.",
      keyConceptsToCover: ["Frame Budget (16ms/8ms)", "UI vs Worker Threads", "Bridge / JSI Serialization"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "Walk through mobile app lifecycle states (Foreground, Background, Process Death) and what state you MUST persist locally when the OS kills your backgrounded app.",
      hint: "OS reclaims background memory arbitrarily; preserve navigation drafts/auth tokens in Keychain/EncryptedSharedPreferences + SQLite/SavedStateHandle.",
      whyAskThis: "Prevents common data-loss bugs under real mobile memory pressure.",
      sampleAnswer:
        "Assume process kill on every background transition: store secrets in Keychain/Keystore, active form/cart drafts in SQLite or SavedStateHandle, and restore deep links cleanly on cold start.",
      keyConceptsToCover: ["Process Death Recovery", "Secure Keychain/Keystore", "Cold vs Warm Start"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "How do you render infinite scrolling feeds with high-res images and video previews without crashing low-RAM devices (OutOfMemory)?",
      hint: "RecyclerView / FlatList / FlashList cell recycling, downsampling images to viewport dimensions, memory + disk LRU cache limits, canceling off-screen requests.",
      whyAskThis: "Essential mobile memory & media pipeline skill.",
      sampleAnswer:
        "Recycle item views via FlashList/RecyclerView, decode resized thumbnails matching exact dp/pt bounds, cap LRU image cache size, and cancel image/video preloads immediately on cell recycle.",
      keyConceptsToCover: ["View Recycling", "Image Downsampling", "LRU Cache Sizing", "Request Cancellation"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Architect an Offline-First sync engine for a field app (create/edit notes offline, merge conflicts cleanly when network returns).",
      hint: "Local-first SQLite/WatermelonDB writes -> monotonic outbox sync queue -> optimistic timestamps/version vectors + conflict UI/LWW policy.",
      whyAskThis: "Separates basic API wrapper apps from resilient mobile engineering.",
      sampleAnswer:
        "Make local SQLite the single UI source of truth, record pending mutations in an ordered outbox queue with client UUIDs, and resolve server version mismatches deterministically on exponential-backoff reconnect.",
      keyConceptsToCover: ["Local-First DB", "Sync Outbox Queue", "Conflict Resolution Policy", "Idempotent Sync"],
    },
    {
      level: 2,
      category: "technical",
      question:
        "Your push notifications work on emulators but fail silently or arrive 20 minutes late on real battery-saving Android/iOS phones. Diagnose.",
      hint: "APNs vs FCM high-priority vs data-only Doze throttling, token rotation persistence, notification service extensions, iOS background fetch caps.",
      whyAskThis: "Real-world push delivery and OS battery throttling fluency.",
      sampleAnswer:
        "Use high-priority alert payloads when time-critical so Android Doze wakes cleanly, refresh and sync rotated push tokens cleanly on startup, and avoid silent background wakes for urgent alerts.",
      keyConceptsToCover: ["FCM/APNs Priority", "Doze/Battery Throttling", "Token Lifecycle Sync"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "App Cold Launch time jumped to 3.8 seconds after recent feature releases. How do you instrument startup phases and bring Time-To-Initial-Display below 1s?",
      hint: "Measure TTID & TTFD, audit static initializers / SDK bloat on `Application.onCreate`/`didFinishLaunching`, defer analytics SDK init, baseline profiles / Hermes bytecode.",
      whyAskThis: "Tests systematic mobile performance profiling.",
      sampleAnswer:
        "Trace cold launch via Perfetto/Instruments Time Profiler, defer third-party SDK init lazily past first frame render, enable Hermes precompiled bytecode or Baseline Profiles, and trim main-thread disk reads.",
      keyConceptsToCover: ["TTID/TTFD Instrumentation", "Deferred SDK Init", "Baseline Profiles / Hermes"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "Explain Universal Links (iOS) and App Links (Android), including domain verification, fallback routing, and auth-redirect pitfalls.",
      hint: "`apple-app-site-association` / `assetlinks.json` hosted over HTTPS, handling cold-launch intents vs warm foreground links, OAuth PKCE security.",
      whyAskThis: "Checks cross-platform routing & secure mobile auth flows.",
      sampleAnswer:
        "Host signed AASA/assetlinks JSON at well-known HTTPS paths for verified domain takeover, route parsed URI intents cleanly across cold/warm launches, and implement OAuth2 + PKCE via ASWebAuthenticationSession/Custom Tabs.",
      keyConceptsToCover: ["AASA / assetlinks Verification", "Cold vs Warm Deep Link", "OAuth2 PKCE"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Design zero-regression OTA hotfixes & phased rollout governance without violating App Store review rules or leaving broken cached bundles.",
      hint: "Distinguish native binary changes vs JS/config updates, rollback health checks on crash-free rate (<99.5% auto-revert), feature-flag kill switches, semantic version gating.",
      whyAskThis: "Staff mobile release architecture and reliability governance.",
      sampleAnswer:
        "Pair native binary staged rollouts with remote kill-switch feature flags and binary-compatible OTA JS bundles that verify checksum integrity and auto-roll back to embedded snapshot on early startup crashes.",
      keyConceptsToCover: ["Rollback Crash Triggers", "Binary Compatibility Gate", "Feature Flag Kill Switches"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "How do you prevent battery drain while maintaining continuous background geolocation + WebSocket telemetry on mobile devices?",
      hint: "Adaptive GPS accuracy/significant-change APIs, geofencing hardware co-processor, coalescing network radios (tail energy), batching telemetry payloads.",
      whyAskThis: "Senior mobile hardware/radio resource engineering.",
      sampleAnswer:
        "Combine hardware significant-location monitoring with accelerometer motion triggers instead of constant high-precision GPS, coalesce background uploads into batched intervals to let cellular radios sleep.",
      keyConceptsToCover: ["Radio Tail Energy", "Adaptive Location / Geofencing", "Batched Wakeups"],
    },
    {
      level: 3,
      category: "debugging",
      question:
        "Users report intermittent native crashes (`SIGSEGV` / `EXC_BAD_ACCESS`) only in production release builds after ProGuard/R8 or Xcode LTO. How do you debug & prevent them?",
      hint: "Retrace dSYM / ProGuard mapping files cleanly in CI/Crashlytics, watch for reflection stripped via R8 keep-rules, C++/Swift weak-self / async concurrency lifetime.",
      whyAskThis: "Principal mobile stability debugging.",
      sampleAnswer:
        "Upload dSYM and R8 mapping artifacts per build SHA automatically to symbolize production stack traces, inspect reflection/JNI models needing keep rules, and guard async callbacks against deallocated references.",
      keyConceptsToCover: ["dSYM/R8 Symbolication", "Keep Rules / JNI Safety", "Memory Lifetime Safety"],
    },
  ],

  "Cybersecurity & Systems Engineer": [
    {
      level: 1,
      category: "core-technical",
      question:
        "Compare Symmetric (AES-GCM), Asymmetric (RSA/ECDSA/Ed25519), and Password Hashing (Argon2id/bcrypt). Why is SHA-256 alone unsafe for user passwords?",
      hint: "SHA-256 is fast and GPU-parallelizable without memory hardness or per-user salt; Argon2id adds tunable memory/time cost + unique salt; AES-GCM gives authenticated encryption.",
      whyAskThis: "Tests foundational applied cryptography correctness.",
      sampleAnswer:
        "Fast hashes like SHA-256 fall rapidly to GPU rainbow/brute-force attacks; Argon2id enforces memory-hard salted hashing, while AES-GCM provides confidential and tamper-evident authenticated encryption via unique nonces.",
      keyConceptsToCover: ["Memory-Hard Salted Hashing", "Authenticated Encryption (AEAD)", "Unique Nonce Discipline"],
    },
    {
      level: 1,
      category: "core-technical",
      question:
        "Explain how SSRF, IDOR, and SQL Injection occur in real codebases and how architectural defaults eliminate entire bug classes vs input blacklisting.",
      hint: "Use parameterized queries (SQLi), strict endpoint ownership checks (IDOR), and allowlisted DNS/IP egress validation disabling metadata IP 169.254.169.254 (SSRF).",
      whyAskThis: "Verifies OWASP top classes with systemic defenses rather than weak regexes.",
      sampleAnswer:
        "Blacklist regexes are trivially bypassed: stop SQLi structurally via parameterized drivers, stop IDOR via server-session ownership predicates, and block SSRF by pinning private/link-local CIDRs cleanly after DNS resolution.",
      keyConceptsToCover: ["Parameterized Queries", "Server-Side Ownership (IDOR)", "DNS Rebinding / SSRF Prevention"],
    },
    {
      level: 1,
      category: "technical",
      question:
        "Walk through TLS 1.3 handshake mechanics, certificate verification, and why disabling SSL verification in SDK flags compromises the entire tunnel.",
      hint: "ECDHE forward secrecy, certificate chain validation against trusted CA root + SAN hostname match, single-RTT handshake, MITM exposure if `rejectUnauthorized: false`.",
      whyAskThis: "Tests network transport security literacy.",
      sampleAnswer:
        "TLS 1.3 negotiates ephemeral ECDHE keys in 1-RTT providing forward secrecy and verifies server identity via CA chain and SAN hostname checks; disabling verification lets any network proxy perform silent MITM.",
      keyConceptsToCover: ["Forward Secrecy (ECDHE)", "Cert Chain & Hostname Verification", "MITM Risks"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Explain memory corruption primitives (Stack Buffer Overflow, Use-After-Free, Integer Overflow) and how ASLR, DEP/NX, Stack Canaries, and Rust/RAII mitigate them.",
      hint: "Canaries detect sequential stack overwrites; NX stops shellcode execution on stack/heap; ASLR randomizes base addresses; UAF enables heap type-confusion.",
      whyAskThis: "Core systems security mastery.",
      sampleAnswer:
        "Stack canaries detect linear buffer smashes, NX prevents data pages executing as instructions, ASLR complicates ROP gadget targeting, while compile-time ownership (Rust/C++ smart pointers) prevents dangling UAF pointers.",
      keyConceptsToCover: ["ASLR & NX/DEP", "Stack Canaries", "Use-After-Free", "Ownership Lifetimes"],
    },
    {
      level: 2,
      category: "system-design",
      question:
        "Design an API key + Webhook authentication system supporting zero-downtime key rotation, instant revocation, and constant-time HMAC validation.",
      hint: "Store only hashed API key + prefix lookup (`pk_live_...`), dual-valid rotation windows, constant-time `timingSafeEqual`, and timestamp tolerance window on HMACs.",
      whyAskThis: "Tests practical cryptographic protocol implementation.",
      sampleAnswer:
        "Index keys by short public prefix while storing SHA-256/HMAC digest of secrets, validate webhook payloads via `crypto.timingSafeEqual` within a strict 5-minute timestamp window, and allow overlapping active keys during rotation.",
      keyConceptsToCover: ["Constant-Time Comparison", "Key Digest Storage", "Replay Window", "Zero-Downtime Rotation"],
    },
    {
      level: 2,
      category: "debugging",
      question:
        "A security scanner flags DNS Rebinding SSRF or JWT `alg: none` / RS256->HS256 confusion vulnerabilities. Explain both attacks and exact hardening fixes.",
      hint: "JWT: explicitly pin allowed asymmetric algorithms array on verify; DNS Rebinding: resolve IP once, verify public CIDR, connect directly to pinned IP instead of re-resolving.",
      whyAskThis: "Probes deeper security flaw mechanics beyond buzzwords.",
      sampleAnswer:
        "Explicitly pin expected verification algorithms (`algorithms: ['RS256']`) so attacker tokens cannot swap to symmetric HMAC verified with public key; stop DNS rebinding by validating resolved public IP and pinning socket connection directly.",
      keyConceptsToCover: ["JWT Algorithm Pinning", "DNS Rebinding Time-of-Check/Use", "Socket IP Pinning"],
    },
    {
      level: 2,
      category: "core-technical",
      question:
        "Compare Linux container sandboxing vs microVMs (Firecracker / gVisor) when running untrusted user code execution (like online judges or AI code sandboxes).",
      hint: "Standard containers share host kernel syscalls (escape surface); seccomp/AppArmor help, while Firecracker gives dedicated guest kernel per tenant with KVM isolation.",
      whyAskThis: "Modern cloud & AI-agent execution sandbox architecture.",
      sampleAnswer:
        "Docker containers share one host kernel so kernel syscall bugs permit container escape; running untrusted code demands strict seccomp-bpf + read-only rootfs or hardware-virtualized microVMs like Firecracker.",
      keyConceptsToCover: ["Shared Kernel Attack Surface", "seccomp-bpf / Capabilities Drop", "MicroVM (Firecracker) Isolation"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "Architect Zero-Trust Workload Identity and Envelope Encryption (KMS/HSM + DEK rotation) across microservices without storing static long-lived secrets.",
      hint: "SPIFFE/SPIRE SVID mTLS certs + short-lived STS federation; KEK inside KMS wraps per-tenant DEKs enabling fast re-keying without decrypting terabytes of rows.",
      whyAskThis: "Staff security architecture design.",
      sampleAnswer:
        "Issue short-lived SPIFFE x509 workload identities for mTLS authorization and encrypt tenant data with rotated Data Encryption Keys wrapped via Envelope Encryption inside KMS/HSM.",
      keyConceptsToCover: ["SPIFFE / mTLS Workload Auth", "Envelope Encryption (KEK/DEK)", "Short-Lived Credentials"],
    },
    {
      level: 3,
      category: "system-design",
      question:
        "You discover a suspected supply-chain compromise inside a dependency or CI runner. Walk through containment, blast-radius forensics, and credential clean-slate recovery.",
      hint: "Isolate runners before wiping (preserve volatile forensics/build logs), audit SBOM provenance & artifact digests, revoke & rotate every downstream token/SSH/API secret, rebuild clean.",
      whyAskThis: "Principal incident security response.",
      sampleAnswer:
        "Quarantine runners while preserving logs and memory/network telemetry, check lockfiles/SBOM checksums against clean registries to scope affected artifacts, invalidate all IAM/deploy tokens, and rebuild reproducibly from verified commits.",
      keyConceptsToCover: ["Forensic Preservation", "SBOM / Digest Scoping", "Credential Blast Revocation", "Clean Rebuild"],
    },
    {
      level: 3,
      category: "technical",
      question:
        "Design a high-throughput eBPF / LSM runtime anomaly detector capturing suspicious reverse shells (`execve`, unexpected outbound sockets) without tanking host CPU.",
      hint: "Use ring-buffer eBPF maps aggregating inside kernel space, filter benign paths before user-space ringbuf flush, track cgroup/namespace correlation.",
      whyAskThis: "Deep systems security observability at kernel boundary.",
      sampleAnswer:
        "Attach eBPF kprobes/tracepoints to `sched_process_exec` and socket connect hooks, filter expected container profiles inside kernel maps, and flush minimal metadata events over zero-copy eBPF ring buffers.",
      keyConceptsToCover: ["eBPF Tracepoints/Ringbuf", "Kernel-Space Filtering", "Container Context Attribution"],
    },
  ],
};

function resolveCanonicalRoleKey(roleInput: string): string {
  const lower = (roleInput || "").toLowerCase().trim();
  if (!lower || lower.includes("full-stack") || lower.includes("full stack") || lower.includes("sde")) {
    return "Full-Stack SDE";
  }
  if (lower.includes("front")) return "Frontend Developer";
  if (lower.includes("back")) return "Backend Engineer";
  if (lower.includes("ml") || lower.includes("machine learning") || lower.includes("data engineer") || lower.includes("ai")) {
    return "ML/Data Engineer";
  }
  if (lower.includes("devops")) return "DevOps & Cloud Engineer";
  if (lower.includes("sre") || lower.includes("cloud")) return "Cloud / SRE";
  if (lower.includes("analyst")) return "Data Analyst";
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("ios") || lower.includes("flutter")) {
    return "Mobile App Developer";
  }
  if (lower.includes("cyber") || lower.includes("security") || lower.includes("systems")) {
    return "Cybersecurity & Systems Engineer";
  }
  return "Full-Stack SDE";
}

export function getRoleBaselineQuestions(
  roleInput: string,
  options?: { mode?: "grill" | "bank" }
): RoleInterviewQuestion[] {
  const canonicalRole = resolveCanonicalRoleKey(roleInput);
  const seeds = ROLE_SEEDS[canonicalRole] || ROLE_SEEDS["Full-Stack SDE"];
  const slugPrefix = canonicalRole.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const built = buildRoleQuestions(slugPrefix, canonicalRole, seeds);

  if (options?.mode === "grill") {
    return built.map((q) => ({
      ...q,
      category: "resume-grill" as InterviewCategory,
    }));
  }

  return built;
}

export function getBaselineAsStudioQuestions(
  roleInput: string,
  mode: "grill" | "bank" = "grill"
): StudioQuestion[] {
  return getRoleBaselineQuestions(roleInput, { mode }).map((q) => ({
    ...q,
    isCustom: mode === "grill",
  }));
}

