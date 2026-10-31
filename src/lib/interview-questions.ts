import { InterviewCategory, InterviewQuestion } from "@/types";

export const INTERVIEW_ROLES = [
  "Full-Stack SDE",
  "Frontend Developer",
  "Backend Engineer",
  "ML/Data Engineer",
  "DevOps & Cloud Engineer",
  "Cloud / SRE",
  "Data Analyst",
  "Mobile App Developer",
  "Cybersecurity & Systems Engineer",
] as const;

export type InterviewRole = (typeof INTERVIEW_ROLES)[number];

export const EXPANDED_CATEGORIES: { id: "all" | InterviewCategory; label: string }[] = [
  { id: "all", label: "All Questions" },
  { id: "core-technical", label: "Core Technical" },
  { id: "system-design", label: "System Design & Architecture" },
  { id: "dsa", label: "DSA & Problem Solving" },
  { id: "debugging", label: "Live Debugging & RCA" },
  { id: "behavioral", label: "Behavioral & STAR" },
  { id: "culture", label: "Culture & Ownership" },
  { id: "custom-jd", label: "Custom JD / Role Tailored" },
];

export const CURATED_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    "id": "fs-1",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does the Next.js App Router handle Server Components versus Client Components, and how do you prevent serialization waterfalls?",
    "hint": "Differentiate between server-side execution with zero bundle impact vs client hydration ('use client'). Discuss Promise.all, parallel data fetching, and Suspense streaming boundaries.",
    "sampleAnswer": "React Server Components run strictly on the server and emit serialized JSON-like Virtual DOM (RSC payload) with zero client JavaScript bundle size. Client components ('use client') hydrate in the browser to provide interactivity. To avoid serialization waterfalls where a client component fetches child data only after mounting, I lift independent data fetches up to server components, leverage Promise.all for parallel promises, and wrap slow async segments in Suspense boundaries to stream HTML via HTTP chunks.",
    "keyConceptsToCover": [
      "RSC payload",
      "zero client bundle",
      "Suspense streaming",
      "serialization boundaries"
    ],
    "followUps": [
      "Can a Server Component be passed as a child to a Client Component?",
      "How do Server Actions maintain CSRF protection?"
    ]
  },
  {
    "id": "fs-2",
    "role": "Full-Stack SDE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a real-time collaborative document editor like Google Docs or Notion. How do you handle conflict resolution and offline editing?",
    "hint": "Compare Operational Transformation (OT) versus Conflict-free Replicated Data Types (CRDTs) like Yjs or Automerge. Cover WebSockets for low-latency broadcast and local IndexedDB.",
    "sampleAnswer": "I would structure the architecture around CRDTs (such as Yjs) combined with WebSocket connections to a state synchronization cluster. Each character or node has a globally unique causal ID. When an edit occurs offline, it mutates local IndexedDB and queues an update vector. Upon reconnection, updates are exchanged and deterministically merged without central lock contention. For enterprise read scalability, changes are snapshotted asynchronously to PostgreSQL or S3.",
    "keyConceptsToCover": [
      "CRDTs (Yjs/Automerge)",
      "WebSockets",
      "IndexedDB persistence",
      "Vector clocks"
    ],
    "followUps": [
      "Why choose CRDTs over Centralized Operational Transformation for P2P/mesh networks?",
      "How do you prune tombstone markers in CRDT documents over time?"
    ]
  },
  {
    "id": "fs-3",
    "role": "Full-Stack SDE",
    "category": "dsa",
    "difficulty": "medium",
    "question": "How would you implement an LRU (Least Recently Used) cache with O(1) get and put operations in TypeScript?",
    "hint": "Combine a Hash Map for O(1) key lookups with a Doubly Linked List for O(1) node removal and re-insertion at the head.",
    "sampleAnswer": "An LRU Cache combines a JavaScript Map (or object) with a Doubly Linked List. The Map stores key -> DoublyLinkedListNode. When get(key) is invoked, we look up the node in O(1) and splice it to the head of the list as most recently accessed. On put(key, value), if the key exists, we update value and move to head; if capacity is exceeded, we remove the tail node in O(1) and delete its key from the hash map, then insert the new node at the head.",
    "keyConceptsToCover": [
      "Hash Map + Doubly Linked List",
      "O(1) pointer manipulation",
      "Sentinel head/tail nodes",
      "Eviction policy"
    ],
    "followUps": [
      "How would you make this thread-safe or process-safe in a multi-worker Node.js cluster?",
      "How does LFU differ from LRU in cache replacement trade-offs?"
    ]
  },
  {
    "id": "fs-4",
    "role": "Full-Stack SDE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "Your Node.js microservice API response latency suddenly degraded from 45ms to 3200ms during peak hours. Walk me through your diagnostic and triage procedure.",
    "hint": "Follow systematic triage: telemetry & APM (Datadog/Prometheus), event loop lag, connection pool exhaustion, unindexed DB queries, GC pauses.",
    "sampleAnswer": "I would immediately check whether the bottleneck is CPU-bound (event loop starvation), memory-bound (V8 garbage collection pauses), or external I/O bound. Using APM traces, I'd inspect p95/p99 breakdown across HTTP handlers. If CPU is low but response times are high, I inspect database connection pool metrics (PgBouncer/Prisma connection timeouts) and query execution plans via EXPLAIN ANALYZE for lock contention or missing indexes. If event loop lag is elevated, I check for synchronous JSON.parse on giant payloads or CPU-heavy cryptographic operations.",
    "keyConceptsToCover": [
      "APM tracing",
      "Event loop lag",
      "Database connection pool exhaustion",
      "EXPLAIN ANALYZE"
    ],
    "followUps": [
      "How do you take and analyze a heap snapshot in production without crashing the process?",
      "What is the difference between latency spikes caused by GC vs DB lock contention?"
    ]
  },
  {
    "id": "fs-5",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain database indexing in PostgreSQL. When would you use a B-tree, GIN, or Hash index, and what are the trade-offs on write performance?",
    "hint": "B-Tree is default for equality and range queries. GIN is optimal for JSONB, arrays, and full-text search. Write penalty arises because every insert/update requires updating tree nodes.",
    "sampleAnswer": "PostgreSQL B-Tree indexes maintain a balanced tree optimal for equality and range queries (<, <=, =, >=). GIN (Generalized Inverted Index) indexes multi-key values like JSONB, arrays, and full-text search tsvector, mapping individual elements to row pointers. While indexes drastically accelerate read filters from O(N) sequential scans to O(log N), every write (INSERT, UPDATE, DELETE) incurs write amplification, WAL generation, and cache invalidation overhead.",
    "keyConceptsToCover": [
      "B-Tree range searches",
      "GIN for JSONB/arrays",
      "Write amplification",
      "Composite index column order"
    ],
    "followUps": [
      "What is a covering index with the INCLUDE clause?",
      "How does PostgreSQL HOT (Heap-Only Tuples) optimization work?"
    ]
  },
  {
    "id": "fs-6",
    "role": "Full-Stack SDE",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you had a strong technical disagreement with a senior engineer or tech lead. How did you handle it?",
    "hint": "Apply the STAR method. Emphasize data-driven decision-making, benchmarking, empathy, disagree and commit, and positive engineering outcomes.",
    "sampleAnswer": "In my previous project, our lead advocated keeping our monolithic ORM abstractions, whereas I proposed migrating high-throughput batch writes to raw parameterized SQL queries because our ingestion latency was spiking. Instead of arguing theoretically, I created a targeted benchmark reproducing 10,000 writes, demonstrating that raw SQL reduced memory allocation by 65% and halved execution time. We reviewed the trade-offs together, agreed on a hybrid approach retaining the ORM for CRUD while using raw SQL for batch ingest, resulting in a 40% reduction in server costs.",
    "keyConceptsToCover": [
      "Data-driven benchmarks",
      "Active listening",
      "Trade-off analysis",
      "Collaborative resolution"
    ],
    "followUps": [
      "What would you have done if the tech lead still rejected your data?",
      "How do you maintain high team velocity when consensus cannot be reached quickly?"
    ]
  },
  {
    "id": "fs-7",
    "role": "Full-Stack SDE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an idempotency system for a payments platform handling webhook events from Stripe or Razorpay. How do you prevent double-charging?",
    "hint": "Unique Idempotency-Key header, atomic distributed locks (Redis Redlock), database transactions with unique constraints, and cached response payloads.",
    "sampleAnswer": "To ensure exactly-once processing semantics, every mutation request requires an Idempotency-Key. The payment gateway attempts to acquire an atomic distributed lock in Redis for that key with a 15-second TTL. If already locked, subsequent concurrent calls return 409 Conflict or wait. When unlocked, we query the PostgreSQL `idempotent_requests` table. If the key exists, we immediately return the cached status without touching bank rails. If new, we execute payment execution and ledger entry inside an ACID transaction and store the response.",
    "keyConceptsToCover": [
      "Idempotency-Key",
      "Redis distributed locking",
      "ACID transactional outbox",
      "State machine replay protection"
    ],
    "followUps": [
      "What happens if the server crashes after charging the card but before saving the database record?",
      "How long should idempotency keys be retained in storage?"
    ]
  },
  {
    "id": "fs-8",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "easy",
    "question": "Explain the CORS (Cross-Origin Resource Sharing) mechanism. Why does the browser send an OPTIONS preflight request?",
    "hint": "Same-Origin Policy protection. Preflight checks for non-simple methods (PUT, DELETE) or custom headers (Authorization) before sending actual payload.",
    "sampleAnswer": "CORS is a browser security mechanism enforcing the Same-Origin Policy. When a frontend makes a request to a different origin, domain, or port with non-simple characteristics (such as PUT/DELETE methods, JSON Content-Type, or Authorization headers), the browser automatically dispatches an HTTP OPTIONS preflight. The server must respond with matching `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` headers before the browser executes the actual request.",
    "keyConceptsToCover": [
      "Same-Origin Policy",
      "OPTIONS preflight",
      "Access-Control-Allow-* headers",
      "Credentials & cookies"
    ],
    "followUps": [
      "Why does setting Access-Control-Allow-Origin: * fail when Access-Control-Allow-Credentials is true?",
      "Can non-browser clients (like curl or mobile apps) be blocked by CORS?"
    ]
  },
  {
    "id": "fs-9",
    "role": "Full-Stack SDE",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Given a stream of incoming user activities, how would you design an algorithm to find the top K most frequent search terms in real-time?",
    "hint": "Combine a Count-Min Sketch or Hash Map for frequency counting with a Min-Heap of size K (or Heavy Hitters algorithm).",
    "sampleAnswer": "For a bounded or single-instance stream, we maintain a Hash Map of word -> frequency and a Min-Heap of size K storing {word, frequency}. For each term, increment its count in the map and update or push into the heap. If heap size exceeds K, pop the minimum in O(log K). For massive multi-node distributed streams, I'd use the Count-Min Sketch probabilistic data structure combined with a Space-Saving or Lossy Counting algorithm to bound memory within fixed constraints.",
    "keyConceptsToCover": [
      "Min-Heap of size K",
      "Count-Min Sketch",
      "Space-Saving algorithm",
      "Time complexity O(N log K)"
    ],
    "followUps": [
      "How would you shard this calculation across Apache Flink or Kafka Streams workers?",
      "What is the error bound of a Count-Min sketch?"
    ]
  },
  {
    "id": "fs-10",
    "role": "Full-Stack SDE",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A user reports: 'I clicked the purchase button twice, and my account was charged twice, but only one order was created.' How do you debug and fix this?",
    "hint": "Identify race condition between payment gateway call and order creation. Propose client-side disabling + server-side idempotency lock + transactional outbox.",
    "sampleAnswer": "This is a classic distributed race condition. Two concurrent HTTP requests entered our backend. Both called the payment gateway, charging the customer twice, but the second request failed on the database order insert due to a unique constraint on the cart ID. The fix requires two layers: first, disable client button on first click with a debounce; second, on the backend, enforce a transactional idempotency key on the payment intent and wrap payment verification and order status in an atomic state machine with automatic refund triggers.",
    "keyConceptsToCover": [
      "Race conditions",
      "Client debounce & server idempotency",
      "Atomic state transitions",
      "Compensating transactions / refunds"
    ],
    "followUps": [
      "How would you write an automated integration test to verify the race condition is resolved?",
      "How does the Saga pattern help with distributed payment workflows?"
    ]
  },
  {
    "id": "fs-11",
    "role": "Full-Stack SDE",
    "category": "culture",
    "difficulty": "easy",
    "question": "What does 'extreme ownership' in engineering mean to you, and how do you practice it when a production incident occurs?",
    "hint": "Owning outcomes end-to-end, writing blameless post-mortems, adding test coverage, and preventing recurring failures.",
    "sampleAnswer": "Extreme ownership means taking responsibility for the end-to-end reliability of the system, rather than pointing fingers at other teams or flaky dependencies. When an incident occurs, I prioritize mitigating user impact first via rollback or feature flags. Post-incident, I write a blameless post-mortem analyzing root causes through the 5 Whys, add regression unit tests, and build automated monitoring alerts so the failure class can never recur silently in production.",
    "keyConceptsToCover": [
      "Blameless post-mortem",
      "5 Whys root cause analysis",
      "End-to-end accountability",
      "Automated alert guards"
    ],
    "followUps": [
      "How do you foster psychological safety so junior engineers report mistakes proactively?",
      "What metrics do you track post-incident to measure reliability?"
    ]
  },
  {
    "id": "fs-12",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain the JavaScript Event Loop, microtasks (Promises, process.nextTick) vs macrotasks (setTimeout, I/O), and how event loop starvation happens.",
    "hint": "Call stack -> Microtask queue (drained completely before next macrotask) -> Macrotask queue -> Rendering phase. Heavy synchronous code blocks the call stack.",
    "sampleAnswer": "JavaScript is single-threaded, executing on a Call Stack. When asynchronous operations finish, callbacks queue in either the Microtask queue (Promise.then, MutationObserver, process.nextTick) or Macrotask queue (setTimeout, setInterval, setImmediate, I/O). The Event Loop executes all microtasks immediately after the current stack empties and before the next macrotask or browser repaint. Event loop starvation occurs when recursive microtasks or CPU-intensive synchronous loops monopolize the stack, preventing I/O and UI repaints.",
    "keyConceptsToCover": [
      "Call Stack",
      "Microtask vs Macrotask priority",
      "Starvation via CPU blocking",
      "Worker threads for offloading"
    ],
    "followUps": [
      "Why does process.nextTick take precedence over Promise.then in Node.js?",
      "How would you offload a heavy regex evaluation so it doesn't freeze the event loop?"
    ]
  },
  {
    "id": "fs-13",
    "role": "Full-Stack SDE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an asynchronous background job processing system like BullMQ or Celery with retry policies, rate-limiting, and dead-letter queues.",
    "hint": "Redis Streams/Lists for queue storage, distributed locks for worker exclusivity, exponential backoff with jitter for retries, and DLQ for unrecoverable errors.",
    "sampleAnswer": "I would architect the job processor using Redis Streams or Sorted Sets for scheduled delay queues. Producers push job payloads with unique job IDs. Consumer worker pools pull jobs using consumer groups, setting an active visibility timeout or heartbeat lock. If a worker fails or exceeds timeout, the job is requeued. Failed jobs undergo exponential backoff with randomized jitter up to 5 attempts before routing to a Dead Letter Queue (DLQ) with alert webhooks for engineer inspection.",
    "keyConceptsToCover": [
      "Redis Streams / Consumer Groups",
      "Exponential backoff with jitter",
      "Visibility timeout",
      "Dead Letter Queue (DLQ)"
    ],
    "followUps": [
      "How do you handle worker graceful shutdown during a Kubernetes rolling update?",
      "How would you prevent job starvation when priority queues are saturated?"
    ]
  },
  {
    "id": "fs-14",
    "role": "Full-Stack SDE",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Describe a project where you had to balance technical debt with aggressive product deadlines. What trade-offs did you accept?",
    "hint": "Use STAR. Discuss conscious technical debt, MVP delivery, documenting compromises, and scheduling repayment sprints.",
    "sampleAnswer": "During a campus placement portal launch, product management requested a multi-tenant analytics dashboard within two weeks. Building a full event-driven analytics pipeline with ClickHouse would have taken six weeks. I consciously chose an acceptable technical debt strategy: we implemented aggregated PostgreSQL materialized views refreshed on a 15-minute cron job. We documented the limitation, set up query latency monitors, shipped the MVP on time, and scheduled a migration once query volume reached 50,000 daily events.",
    "keyConceptsToCover": [
      "Conscious technical debt",
      "Materialized views MVP",
      "Documenting trade-offs",
      "Scheduled refactoring milestones"
    ],
    "followUps": [
      "How did you convince product leadership to allocate sprint time for paying down that debt?",
      "What indicators told you it was time to migrate away from the MVP approach?"
    ]
  },
  {
    "id": "fs-15",
    "role": "Full-Stack SDE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "You observe memory usage continually climbing on your containerized Node.js service until the Linux OOM-killer terminates the container. How do you find the leak?",
    "hint": "Take heap snapshots via Chrome DevTools / v8-profiler, compare retained sizes, look for global event listener accumulation, unclosed streams, or unbounded in-memory caches.",
    "sampleAnswer": "I would start by capturing two V8 heap snapshots at 30-minute intervals under load using `--inspect` or heapdump. Using Chrome DevTools Memory Inspector, I use the 'Comparison' view to sort by retained size. Common culprits in Node.js are unbounded in-memory cache maps without TTLs, dangling EventEmitter listeners (`on('data')` without `off`), unclosed database cursors, and closures retaining large outer scopes. Once identified, I add a targeted test verifying garbage collection using `global.gc()`.",
    "keyConceptsToCover": [
      "V8 Heap snapshots",
      "Shallow vs Retained size",
      "Dangling event listeners",
      "Unbounded Map memory leaks"
    ],
    "followUps": [
      "How does Node.js garbage collection distinguish between young generation (Scavenge) and old generation (Mark-Sweep)?",
      "How do weak references (`WeakMap`/`WeakSet`) prevent memory retention?"
    ]
  },
  {
    "id": "fs-16",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "What is WebAssembly (Wasm) and when is it appropriate to incorporate Wasm modules into a full-stack web application?",
    "hint": "Near-native binary bytecode running in browser sandboxes. Used for compute-intensive tasks: video encoding, cryptography, image filters, CAD rendering, game physics.",
    "sampleAnswer": "WebAssembly is a compact binary instruction format providing near-native execution performance in modern browser runtimes alongside JavaScript. It is compiled from systems languages like Rust, C++, or Go. While standard DOM manipulation and CRUD APIs remain faster in JavaScript due to lack of marshaling overhead, Wasm is ideal for compute-intensive client operations such as client-side PDF rendering, video transcoding (ffmpeg.wasm), audio synthesis, cryptography, and complex 3D simulation engines.",
    "keyConceptsToCover": [
      "Near-native binary execution",
      "Memory linear array sharing",
      "Marshaling overhead trade-off",
      "Rust/C++ to Wasm compilation"
    ],
    "followUps": [
      "How does memory sharing work between JavaScript and WebAssembly linear memory?",
      "What are WebAssembly threads and how do they utilize SharedArrayBuffer?"
    ]
  },
  {
    "id": "fs-17",
    "role": "Full-Stack SDE",
    "category": "dsa",
    "difficulty": "medium",
    "question": "How would you detect and break a cycle in a directed dependency graph (such as a build system or package manager dependency tree)?",
    "hint": "Depth-First Search (DFS) with 3-state coloring (White = unvisited, Gray = visiting/in current recursion stack, Black = fully visited). Cycle exists if we encounter a Gray node.",
    "sampleAnswer": "To detect cycles in a directed dependency graph, we use topological sorting via Kahn's algorithm (in-degree tracking) or Depth-First Search with three-color node marking. In the three-color DFS approach, all nodes start White (unvisited). When we enter a node, we color it Gray (in the current active stack). If we traverse an edge to an already Gray node, a back-edge exists, proving a cycle. When backtracking, we mark the node Black. If Kahn's algorithm is used, a cycle exists if the processed node count is less than the total graph nodes.",
    "keyConceptsToCover": [
      "Three-color DFS marking",
      "Back-edges in directed graphs",
      "Kahn's algorithm (in-degree)",
      "Topological sorting order"
    ],
    "followUps": [
      "How would you extract the exact path of nodes forming the circular dependency?",
      "How does npm or Yarn resolve peer dependency cycles?"
    ]
  },
  {
    "id": "fs-18",
    "role": "Full-Stack SDE",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Explain the differences between WebSockets, Server-Sent Events (SSE), and HTTP Long Polling. When should you choose each?",
    "hint": "WebSockets: full-duplex bidirectional TCP. SSE: unidirectional server-to-client HTTP text stream (ideal for LLM token streaming). Long Polling: fallback loop.",
    "sampleAnswer": "HTTP Long Polling repeatedly opens HTTP requests that hold until data is available, incurring heavy header overhead. Server-Sent Events (SSE) establish a single persistent unidirectional HTTP/2 connection streaming UTF-8 text from server to client with built-in reconnection and event IDs, making SSE ideal for live LLM token streaming and stock tickers. WebSockets provide a full-duplex, bidirectional binary/text protocol over a single TCP socket, making it the choice for multiplayer gaming, live chat, and collaborative whiteboards.",
    "keyConceptsToCover": [
      "Bidirectional WebSockets",
      "Unidirectional SSE over HTTP/2",
      "HTTP Long Polling overhead",
      "LLM streaming with SSE"
    ],
    "followUps": [
      "Why does SSE work better with standard HTTP/2 multiplexing than WebSockets?",
      "How do you scale WebSocket connections across multiple backend server instances?"
    ]
  },
  {
    "id": "fs-19",
    "role": "Full-Stack SDE",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A batch database update randomly deadlocks once a day in production with no obvious error pattern. How do you isolate the non-deterministic trigger?",
    "hint": "Enable PostgreSQL log_min_messages and log_lock_waits. Capture statement timestamps, check for concurrent cron jobs running un-ordered updates.",
    "sampleAnswer": "Non-deterministic deadlocks are usually caused by concurrent scheduled jobs or asynchronous workers updating the same table in differing row orders. First, I set `log_lock_waits = on` and `deadlock_timeout = 500ms` in postgresql.conf to capture full query statements and locked relation IDs in the system log. Next, I correlate timestamps against our background worker schedule. The fix is ensuring both the batch cron and online transactional routes sort IDs ascending before executing lock acquisition statements.",
    "keyConceptsToCover": [
      "PostgreSQL log_lock_waits",
      "Sorting primary keys prior to bulk updates",
      "Background worker vs online route overlap",
      "Lock timeout defenses"
    ],
    "followUps": [
      "How does setting a lock_timeout protect API latency during high contention?",
      "What is an advisory lock in PostgreSQL and when should you use it?"
    ]
  },
  {
    "id": "fs-20",
    "role": "Full-Stack SDE",
    "category": "culture",
    "difficulty": "easy",
    "question": "How do you approach giving constructive code review feedback to peers without slowing down team velocity or causing friction?",
    "hint": "Separate nitpicks from blockers using conventional comments, praise good engineering, suggest code snippets, and take contentious debates to quick syncs.",
    "sampleAnswer": "I use the Conventional Comments framework (e.g. prefixing labels like 'suggestion', 'question', 'nitpick', or 'blocking'). I focus on the code and system architecture rather than the author. If a review has architectural concerns, I provide concrete code examples and benchmarks. For minor stylistic preferences, I leave them as non-blocking nits or let automated linters handle them. If a discussion exceeds three comment replies, I invite the author to a quick 5-minute sync to align immediately and unblock the PR.",
    "keyConceptsToCover": [
      "Conventional Comments prefixes",
      "Focus on architecture not personality",
      "Non-blocking nitpicks",
      "5-minute sync rule to prevent comment ping-pong"
    ],
    "followUps": [
      "How do you handle an author who repeatedly ignores review guidelines?",
      "What is your philosophy on pull request size and review turnaround time?"
    ]
  },
  {
    "id": "fs-21",
    "role": "Full-Stack SDE",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you identified a critical flaw in a product specification before code was written. How did you handle it?",
    "hint": "Use STAR. Emphasize proactive design doc review, edge-case analysis, discussing data models with PMs, and saving engineering rework.",
    "sampleAnswer": "While reviewing an RFC for a referral bonus feature, I realized the spec assumed user referrals were strictly one-to-one and immediate. I pointed out that users could create referral loops or delay account activation for months, which would cause race conditions and ledger discrepancies in our payout service. I met with the product manager, proposed an explicit state machine for referral lifecycles with expiration windows, and added abuse prevention rate-limiting to the specification, saving an estimated 3 weeks of architectural rework.",
    "keyConceptsToCover": [
      "RFC / Design doc review",
      "Edge-case discovery",
      "Partnering with product management",
      "Preventing technical debt proactively"
    ],
    "followUps": [
      "How do you balance thorough specification review with rapid execution?",
      "How do you decide when a design doc is 'good enough' to start coding?"
    ]
  },
  {
    "id": "fs-22",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain the differences between Optimistic Concurrency Control (OCC) and Pessimistic Locking. When is each optimal in web systems?",
    "hint": "OCC checks version/timestamp at commit time (great for low conflict reads). Pessimistic locks rows (SELECT FOR UPDATE) preventing any concurrent writes (great for high conflict reservations).",
    "sampleAnswer": "Optimistic Concurrency Control assumes record conflicts are rare. Each row stores a `version` integer. When updating, the query runs `UPDATE table SET val = :val, version = version + 1 WHERE id = :id AND version = :oldVersion`. If no rows are updated, a conflict occurred and the application retries. This is ideal for read-heavy systems with rare write overlap. Pessimistic locking explicitly locks rows using `SELECT ... FOR UPDATE`, blocking other transactions until commit. It is optimal for high-contention resources like ticket booking or inventory counters where retrying repeatedly is too expensive.",
    "keyConceptsToCover": [
      "OCC version column",
      "Pessimistic SELECT FOR UPDATE",
      "Read-heavy vs High-contention workloads",
      "Deadlock risks of pessimistic locks"
    ],
    "followUps": [
      "How does SKIP LOCKED allow building high-throughput queue consumers in PostgreSQL?",
      "What happens to read performance when using SELECT FOR UPDATE?"
    ]
  },
  {
    "id": "fe-1",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does React 19's new Compiler and Server Actions change state management and eliminate the need for useMemo, useCallback, and forwardRef?",
    "hint": "React Compiler (Forget) auto-memoizes component render trees and hook dependencies at build-time. Server Actions allow direct form mutations. forwardRef is deprecated in favor of ref as a prop.",
    "sampleAnswer": "React 19 introduces the React Compiler, an optimizing ahead-of-time compiler that analyzes JavaScript semantics to automatically memoize JSX subtrees and computed values. This eliminates the boilerplate of manually specifying useMemo and useCallback dependency arrays. Additionally, refs are now passed directly as standard component props without needing `forwardRef`, and Actions (`useActionState`, `useOptimistic`) streamline asynchronous mutation handling directly without external state libraries.",
    "keyConceptsToCover": [
      "React Compiler auto-memoization",
      "Direct ref prop",
      "useActionState & useOptimistic",
      "Form mutation lifecycle"
    ],
    "followUps": [
      "How does useOptimistic improve perceived user experience during network latency?",
      "What rules of hooks still apply under the React Compiler?"
    ]
  },
  {
    "id": "fe-2",
    "role": "Frontend Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a high-performance virtualized Infinite Scroll component that renders 100,000 items with dynamic row heights and 60 FPS scrolling.",
    "hint": "Render only visible items in the viewport plus overscan buffer. Track dynamic item heights via ResizeObserver, use binary search on prefix sum offsets.",
    "sampleAnswer": "Rendering 100,000 DOM nodes crashes the browser DOM tree. A virtualized list renders only items currently visible inside the scroll viewport plus an overscan buffer of 3-5 items. For dynamic heights, we maintain a position cache using a prefix sum array of measured item heights. As rows render, a `ResizeObserver` measures actual heights and updates the prefix sums. On scroll, we binary search the prefix sum array in O(log N) to determine the startIndex and endIndex, positioning items using CSS `transform: translateY()`.",
    "keyConceptsToCover": [
      "Viewport windowing",
      "ResizeObserver dynamic measurements",
      "Binary search prefix sums",
      "GPU-accelerated translate3d"
    ],
    "followUps": [
      "How do you prevent scroll jitter when items above the current scroll offset resize dynamically?",
      "Why use CSS transforms instead of top/left positioning for scroll virtualization?"
    ]
  },
  {
    "id": "fe-3",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the Critical Rendering Path. How do browser parsing, DOM construction, CSSOM, Render Tree, Layout, and Paint interact?",
    "hint": "HTML parsing -> DOM; CSS parsing -> CSSOM (render-blocking); combine to Render Tree -> Layout (reflow) -> Paint (rasterization) -> Composite. JS is parser-blocking unless async/defer.",
    "sampleAnswer": "The browser requests HTML and converts raw bytes into characters, tokens, and nodes to build the DOM. Concurrently, CSS is fetched and parsed into the CSSOM, which is render-blocking. The browser merges DOM and CSSOM to construct the Render Tree, filtering out invisible nodes (`display: none`). Next, Layout calculates exact geometric coordinates and sizes on the screen (Reflow). Finally, Paint converts vector elements into pixels on layers, and Compositing assembles layers on the GPU.",
    "keyConceptsToCover": [
      "DOM & CSSOM construction",
      "Render Tree computation",
      "Layout (Reflow) vs Paint",
      "GPU Compositing layers"
    ],
    "followUps": [
      "What CSS properties trigger only Compositing without triggering Layout or Paint?",
      "What is the difference between script async and defer?"
    ]
  },
  {
    "id": "fe-4",
    "role": "Frontend Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Your team's Next.js application has poor Core Web Vitals: LCP is 4.8s and CLS is 0.35. How do you profile and fix these metrics?",
    "hint": "LCP: optimize hero image with priority, preconnect, WebP/AVIF, eliminate render-blocking fonts. CLS: provide explicit width/height ratios, reserve space for dynamic ads/banners.",
    "sampleAnswer": "For LCP (Largest Contentful Paint), I inspect Chrome DevTools Performance and Lighthouse to find the LCP element. If it's a hero image, I add `priority` in Next.js `<Image>`, use AVIF/WebP formats, preload the image link in the HTML header, and eliminate render-blocking third-party scripts. For CLS (Cumulative Layout Shift), I ensure all images and embeds have explicit `width` and `height` aspect-ratio wrappers and reserve skeleton placeholder dimensions for dynamically loaded content to prevent content shifting.",
    "keyConceptsToCover": [
      "Core Web Vitals (LCP, CLS, INP)",
      "Image priority preloading",
      "CSS aspect-ratio placeholders",
      "Web font display: swap"
    ],
    "followUps": [
      "What replaced First Input Delay (FID) in Core Web Vitals and how is Interaction to Next Paint (INP) measured?",
      "How do custom web fonts cause layout shifts?"
    ]
  },
  {
    "id": "fe-5",
    "role": "Frontend Developer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement a deep clone function in JavaScript that handles nested objects, arrays, Dates, RegExps, and circular references.",
    "hint": "Use a WeakMap to track visited objects to avoid infinite recursion on circular references. Check constructor types for Date and RegExp.",
    "sampleAnswer": "While `structuredClone()` is now native, implementing deep clone manually requires a recursive traversal using a `WeakMap` cache to handle circular references. For primitives, return as-is. For Date and RegExp, instantiate new instances with their underlying values. If the object exists in our WeakMap, return the cached reference. Otherwise, initialize a new target based on `Array.isArray(obj)` or `{}` and recursively copy all own enumerable properties using `Reflect.ownKeys()`.",
    "keyConceptsToCover": [
      "WeakMap circular reference tracking",
      "Specialized object constructors (Date, RegExp)",
      "Reflect.ownKeys",
      "Prototype preservation"
    ],
    "followUps": [
      "Why does JSON.parse(JSON.stringify(obj)) fail on functions, Dates, and undefined?",
      "What limitations does native structuredClone() have?"
    ]
  },
  {
    "id": "fe-6",
    "role": "Frontend Developer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you had to advocate for web accessibility (a11y) or internationalization when project timelines were tight.",
    "hint": "Use STAR. Emphasize business impact, legal compliance (WCAG 2.1 AA), screen reader testing, semantic HTML, and accessibility tree audit.",
    "sampleAnswer": "During a major checkout redesign, accessibility was initially marked as low priority due to a tight deadline. I demonstrated to product managers that keyboard-only navigation was completely broken on our custom dropdowns and screen readers could not announce error states. I proved that fixing this with semantic HTML (`<button>`, `aria-expanded`, `aria-live`) would take less than two days and expand our market reach to 15% more users while preventing WCAG compliance violations. We implemented the changes, and accessibility audit scores jumped from 62 to 98.",
    "keyConceptsToCover": [
      "WCAG 2.1 AA guidelines",
      "Semantic HTML over custom divs",
      "ARIA live regions",
      "Keyboard navigation testing"
    ],
    "followUps": [
      "What is the accessibility tree and how does it relate to the DOM?",
      "How do you automate accessibility regression testing in CI/CD?"
    ]
  },
  {
    "id": "fe-7",
    "role": "Frontend Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a Microfrontend architecture for an enterprise dashboard where 4 independent engineering teams deploy parts of the UI without breaking each other.",
    "hint": "Module Federation (Webpack 5/Vite), isolated routing, shared dependency singletons (React, design tokens), resilient error boundaries.",
    "sampleAnswer": "I would architect the solution around Webpack 5 Module Federation or native ESM remotes. A lightweight shell host application manages authentication, shell layout, and top-level routing. Each feature team owns a remote container deployed independently to an S3 bucket with versioned URLs. The shell imports remote modules asynchronously with fallback Suspense and Error Boundaries to prevent a failure in one widget from bringing down the entire portal. Shared libraries like React and TanStack Query are marked as singletons with strict semver matching.",
    "keyConceptsToCover": [
      "Module Federation",
      "Remote containers vs Host shell",
      "Shared singleton dependencies",
      "Isolated Error Boundaries"
    ],
    "followUps": [
      "How do you share global authentication state across microfrontends without tight coupling?",
      "What are the performance trade-offs of microfrontends compared to an optimized monolith?"
    ]
  },
  {
    "id": "fe-8",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how React's Fiber reconciler works. What is the difference between the render/reconciliation phase and the commit phase?",
    "hint": "Fiber node linked list tree (child, sibling, return). Render phase is asynchronous and interruptible via time-slicing; Commit phase is synchronous and mutates the real DOM.",
    "sampleAnswer": "React Fiber rewritten the reconciler to enable incremental rendering and priority scheduling. A Fiber is a plain JavaScript object representing a unit of work in a linked list tree with `child`, `sibling`, and `return` pointers. Work occurs in two distinct phases: the Render/Reconciliation phase, which computes diffs on the workInProgress tree and is asynchronous and interruptible by the browser scheduler; and the Commit phase, which is synchronous and uninterruptedly applies DOM mutations, invokes `useLayoutEffect`, and updates component refs.",
    "keyConceptsToCover": [
      "Fiber linked list structure",
      "Interruptible render phase vs Synchronous commit",
      "workInProgress tree swap",
      "Double buffering"
    ],
    "followUps": [
      "What is time-slicing and how does requestIdleCallback / MessageChannel enable it?",
      "Why must the commit phase remain strictly synchronous?"
    ]
  },
  {
    "id": "fe-9",
    "role": "Frontend Developer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "Users on mobile devices complain of severe UI lag and dropped frames (jank) during an interactive drag-and-drop workflow. How do you find the root cause?",
    "hint": "Use Chrome DevTools Performance profiler. Look for long tasks (> 50ms), forced synchronous layouts (layout thrashing), and non-passive touch listeners.",
    "sampleAnswer": "I record a trace using Chrome DevTools Performance tab with 4x CPU throttling. I inspect the frame rate timeline for red 'Long Task' bars (>50ms). A primary culprit is Layout Thrashing: reading geometric properties like `offsetHeight` or `getBoundingClientRect()` immediately followed by writing style properties within a loop, forcing the browser into repeated synchronous reflows. The fix is batching reads and writes via `requestAnimationFrame`, using CSS `touch-action: none`, and applying CSS `transform: translate3d()` to trigger GPU compositing instead of layout.",
    "keyConceptsToCover": [
      "Layout Thrashing (Forced Reflow)",
      "requestAnimationFrame scheduling",
      "GPU compositing layers (will-change)",
      "Passive event listeners"
    ],
    "followUps": [
      "What is the difference between passive and non-passive event listeners?",
      "How does CSS will-change affect GPU memory consumption?"
    ]
  },
  {
    "id": "fe-10",
    "role": "Frontend Developer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement a custom debounce and throttle function with immediate execution (leading edge) and trailing edge options in TypeScript.",
    "hint": "Debounce delays execution until delay elapsed since last invocation. Throttle guarantees execution at most once every interval.",
    "sampleAnswer": "A debounce function delays execution until a quiet period of `delay` ms has elapsed. It stores a `timer` ref; upon each invocation, it clears the existing timer and schedules a new one. For `leading: true`, it executes immediately if no active timer exists. A throttle function ensures a callback runs at most once per `limit` ms: it calculates `remaining = limit - (Date.now() - lastRun)`, immediately running when remaining <= 0 and scheduling a trailing timeout for any call made during the cooldown.",
    "keyConceptsToCover": [
      "Debounce vs Throttle",
      "Closure timer references",
      "Leading vs Trailing edge flags",
      "Cleanup on unmount"
    ],
    "followUps": [
      "When should you use debounce vs throttle in search auto-complete vs window resize?",
      "How do you ensure proper TypeScript generic typings for debounced functions?"
    ]
  },
  {
    "id": "fe-11",
    "role": "Frontend Developer",
    "category": "culture",
    "difficulty": "easy",
    "question": "How do you balance aesthetic design fidelity with technical performance constraints when collaborating with UI/UX designers?",
    "hint": "Early technical review of Figma files, negotiating micro-interactions, providing design token systems, and proving impact with real device demos.",
    "sampleAnswer": "I establish an early collaborative feedback loop during the Figma wireframing stage rather than after designs are finalized. If a design includes heavy blur filters or un-paginated infinite lists that will compromise mobile performance, I create a quick prototype on a real low-end phone to demonstrate the frame rate drop. I propose performance-friendly alternatives—such as CSS hardware-accelerated opacities or staggered skeleton states—that preserve the designer's visual intent while guaranteeing 60 FPS performance.",
    "keyConceptsToCover": [
      "Figma design-to-code collaboration",
      "Performance budget negotiation",
      "Design token systems",
      "Low-end device testing"
    ],
    "followUps": [
      "How do design tokens in Tailwind / Style Dictionary improve engineering-design velocity?",
      "How do you handle designer feedback when CSS cross-browser rendering differs?"
    ]
  },
  {
    "id": "fe-12",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how Service Workers and the Cache API enable Offline-First Progressive Web Apps (PWAs). Compare Cache-First vs Stale-While-Revalidate.",
    "hint": "Service Worker runs on a separate worker thread intercepting fetch requests. Cache-First returns cached asset instantly. Stale-While-Revalidate returns cached version while updating in background.",
    "sampleAnswer": "Service Workers act as client-side network proxies running on a background thread. During installation, they pre-cache static assets into the Cache API. On HTTP requests, the `fetch` event handler intercepts the call. In Cache-First strategy, the worker checks cache and serves immediately, falling back to network only on cache miss (optimal for fonts, images, hashed JS bundles). In Stale-While-Revalidate, it instantly serves the cached version for zero-latency UI while asynchronously fetching and updating the cache in the background (optimal for avatars, feeds, and articles).",
    "keyConceptsToCover": [
      "Service Worker lifecycle (Install, Activate, Fetch)",
      "Cache-First vs Stale-While-Revalidate",
      "Background sync API",
      "IndexedDB integration"
    ],
    "followUps": [
      "How do you handle cache invalidation when a new version of the app is deployed?",
      "Why can't Service Workers access the window or DOM directly?"
    ]
  },
  {
    "id": "be-1",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain the four ACID properties in relational databases and how different isolation levels (Read Committed vs Repeatable Read vs Serializable) prevent anomalies.",
    "hint": "Atomicity (all or nothing), Consistency (invariants hold), Isolation (concurrent safety), Durability (WAL). Anomalies: Dirty read, Non-repeatable read, Phantom read, Write skew.",
    "sampleAnswer": "ACID guarantees transaction reliability. Atomicity ensures all mutations succeed or roll back. Consistency preserves schema invariants. Isolation prevents concurrent transactions from interfering. Durability guarantees committed data survives crashes via Write-Ahead Logging (WAL). In Read Committed, transactions see only committed data, preventing dirty reads but allowing non-repeatable reads. Repeatable Read uses snapshot isolation (MVCC) to ensure consistent reads throughout the transaction. Serializable uses two-phase locking or SSI to eliminate phantom reads and write skew.",
    "keyConceptsToCover": [
      "ACID definitions",
      "MVCC (Multi-Version Concurrency Control)",
      "Write-Ahead Logging (WAL)",
      "Isolation anomalies (Dirty, Phantom, Skew)"
    ],
    "followUps": [
      "What is the performance overhead of Serializable isolation in high-write systems?",
      "How does PostgreSQL implement MVCC using xmin and xmax transaction IDs?"
    ]
  },
  {
    "id": "be-2",
    "role": "Backend Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a distributed rate limiter that supports sliding window rate limits across a cluster of 50 API gateway instances handling 100,000 requests/sec.",
    "hint": "Compare Token Bucket vs Sliding Window Log vs Sliding Window Counter in Redis using Lua scripts for atomicity. Discuss local memory batching for scale.",
    "sampleAnswer": "At 100,000 req/sec, round-tripping every request to a centralized Redis introduces network bottlenecks. I would implement a two-tier rate limiter. The algorithm uses the Sliding Window Counter approximation: current window count + previous window count * weight. In Redis, this runs via an atomic Lua script across sharded clusters based on hash(client_ip). To handle extreme throughput, each gateway instance buffers local counts in memory for 100ms and syncs deltas asynchronously to Redis.",
    "keyConceptsToCover": [
      "Sliding Window Counter algorithm",
      "Redis atomic Lua script",
      "Two-tier local caching",
      "Graceful degradation on Redis failure"
    ],
    "followUps": [
      "How do you handle Redis cluster node failure without blocking legitimate traffic?",
      "What HTTP response headers should a rate limiter return?"
    ]
  },
  {
    "id": "be-3",
    "role": "Backend Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A dead-lock is detected in PostgreSQL: 'Process 12345 waits for ExclusiveLock on relation...'. How do you locate the transactions and architect the schema to prevent deadlocks?",
    "hint": "Query pg_stat_activity and pg_locks. Deadlocks occur when transactions acquire locks in different orders. Fix by ordering row updates consistently.",
    "sampleAnswer": "To diagnose, I query `pg_locks` joined with `pg_stat_activity` to inspect the exact SQL queries and lock types held by both process IDs. Deadlocks typically happen when Transaction A updates Row 1 then Row 2, while Transaction B concurrently updates Row 2 then Row 1. The definitive fix is enforcing strict lock acquisition ordering: always sort IDs before issuing `UPDATE ... WHERE id IN (...)` or `SELECT FOR UPDATE`, and keep transactions short by eliminating external network calls inside DB transactions.",
    "keyConceptsToCover": [
      "pg_locks and pg_stat_activity",
      "Consistent lock acquisition ordering",
      "SELECT ... FOR UPDATE row locks",
      "Removing API calls from transactions"
    ],
    "followUps": [
      "What is the difference between optimistic concurrency control and pessimistic locking?",
      "How does PostgreSQL automatically detect and resolve deadlocks?"
    ]
  },
  {
    "id": "be-4",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the differences between gRPC and REST. When would you choose Protocol Buffers over JSON for inter-service communication?",
    "hint": "gRPC uses HTTP/2 multiplexing, binary Protocol Buffers serialization, strict typed contracts, and bidirectional streaming. REST is standard for public APIs.",
    "sampleAnswer": "REST uses HTTP/1.1 with text-based JSON, which is human-readable and universally supported by browsers, making it ideal for external client APIs. gRPC uses HTTP/2 binary framing and Protocol Buffers for strongly typed contract-first schemas. Protobuf serialization is up to 5-10x faster and requires significantly smaller payload bandwidth than JSON. gRPC supports multiplexed streams, bi-directional streaming, and built-in client generation, making it the preferred standard for internal microservices.",
    "keyConceptsToCover": [
      "Protocol Buffers binary serialization",
      "HTTP/2 multiplexed streams",
      "Contract-first schemas (.proto)",
      "Internal microservices vs Public APIs"
    ],
    "followUps": [
      "How do you handle backward compatibility in Protocol Buffers schemas?",
      "Why is browser support for gRPC limited without gRPC-Web proxies?"
    ]
  },
  {
    "id": "be-5",
    "role": "Backend Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an Event-Driven Notification System that sends push notifications, emails, and SMS to millions of users with priority queues and deduplication.",
    "hint": "Producer -> Apache Kafka / RabbitMQ -> Priority Worker Queues -> Third-party provider adapters (Twilio, SendGrid) -> User notification preferences & rate-limiting.",
    "sampleAnswer": "The architecture separates event generation from delivery. Services publish notification events to Kafka partitioned by `user_id`. Notification consumer services read events, check user channel preferences and frequency caps in Redis, and route jobs to BullMQ priority queues (High: OTP/Transactional, Medium: Mentions, Low: Marketing). Dedicated provider workers dispatch requests to SendGrid, APNs, or Twilio with circuit breakers and fallback providers. Delivery receipts update status tables asynchronously.",
    "keyConceptsToCover": [
      "Kafka event partitioning",
      "Priority queues (Transactional vs Marketing)",
      "Circuit breakers for external providers",
      "User frequency capping"
    ],
    "followUps": [
      "How do you handle provider outages (e.g., SendGrid returning 500s)?",
      "How do you guarantee user unsubscribe preferences are strictly honored?"
    ]
  },
  {
    "id": "be-6",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain Apache Kafka architecture: topics, partitions, consumer groups, consumer offsets, and how Kafka guarantees ordered processing.",
    "hint": "Topics are sharded across partitions. Messages with the same partition key land in the same partition and are strictly ordered. Consumer groups balance partitions 1:1.",
    "sampleAnswer": "Kafka is a distributed commit log. Topics are divided into partitions distributed across cluster brokers. Messages are written sequentially with incremental 64-bit offsets. Kafka guarantees strict FIFO ordering ONLY within an individual partition, achieved by hashing a message key (e.g., `user_id`). Within a consumer group, each partition is consumed by exactly one consumer thread at any given time. Consumers periodically commit their offset back to the `__consumer_offsets` internal topic.",
    "keyConceptsToCover": [
      "Partition key hashing",
      "Strict ordering within partition",
      "Consumer groups & rebalancing",
      "__consumer_offsets commit log"
    ],
    "followUps": [
      "What happens during a consumer group rebalance and how does Cooperative Sticky Rebalance reduce downtime?",
      "What is the difference between at-least-once, at-most-once, and exactly-once processing in Kafka?"
    ]
  },
  {
    "id": "be-7",
    "role": "Backend Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Design an algorithm to find the lowest common ancestor (LCA) of two nodes in a binary tree, and explain how LCA is used in Git merge commit resolution.",
    "hint": "Recursive traversal: if root matches p or q, return root; recurse left and right; if both return non-null, root is LCA. In Git, LCA is the common base commit for 3-way merges.",
    "sampleAnswer": "In a binary tree, we traverse recursively: if the current node is null or equals node P or Q, return it. We recursively search left and right subtrees. If both return non-null, the current node is the Lowest Common Ancestor. In Git, commit histories form a Directed Acyclic Graph (DAG). Finding the LCA between two divergent branches locates the merge base commit, which is crucial for 3-way merge algorithms to detect modifications made by either branch relative to the common ancestor.",
    "keyConceptsToCover": [
      "Tree recursive LCA traversal",
      "Git DAG merge-base",
      "Three-way merge algorithms",
      "Time complexity O(N), Space O(H)"
    ],
    "followUps": [
      "How do you find the LCA in an arbitrary DAG where multiple common ancestors exist (criss-cross merge)?",
      "How does binary lifting find LCA in O(log N) for static trees?"
    ]
  },
  {
    "id": "be-8",
    "role": "Backend Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A high-write database experiences extreme disk write latency and replication lag. You discover the Write-Ahead Log (WAL) is generating 50GB of logs per hour. How do you triage this?",
    "hint": "Inspect autovacuum settings, unindexed foreign key cascades, long-running transactions holding WAL retention, and high-frequency UPDATE statements touching indexed columns.",
    "sampleAnswer": "Excessive WAL generation typically stems from full-page writes after checkpoints, un-tuned autovacuum, or frequent bulk updates touching indexed columns. First, I query `pg_stat_database` and inspect checkpoint frequency in PostgreSQL logs. If checkpoints happen every 30 seconds, `max_wal_size` is too small, triggering constant full-page writes. Second, I look for queries running frequent `UPDATE` statements on indexed columns, which prevents Heap-Only Tuples (HOT) optimization and causes row pointers and index entries to duplicate.",
    "keyConceptsToCover": [
      "PostgreSQL WAL generation & checkpoints",
      "Heap-Only Tuples (HOT) optimization",
      "max_wal_size and checkpoint_completion_target",
      "Replication lag root causes"
    ],
    "followUps": [
      "How does replication lag affect read-after-write consistency in multi-replica architectures?",
      "What is WAL archiving and point-in-time recovery (PITR)?"
    ]
  },
  {
    "id": "ml-1",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the difference between Batch Processing and Stream Processing. When would you choose Apache Spark vs Apache Flink?",
    "hint": "Batch processes bounded data at scheduled intervals (high throughput, high latency). Stream processes unbounded continuous data with millisecond latency.",
    "sampleAnswer": "Batch processing handles large bounded datasets at scheduled intervals (e.g., hourly/daily ETLs using Apache Spark or Snowflake) optimizing for total throughput. Stream processing ingests continuous, unbounded event data event-by-event with sub-second latencies using Apache Flink. Spark is ideal for complex distributed model training, feature extraction, and large warehouse transformations. Flink is chosen when strict low latency and exact event-time windowing (e.g., real-time fraud detection) are required.",
    "keyConceptsToCover": [
      "Bounded vs Unbounded data",
      "Throughput vs Latency trade-off",
      "Event-time vs Processing-time",
      "Watermarks & windowing"
    ],
    "followUps": [
      "What is a watermark in stream processing and how does it handle late-arriving events?",
      "What is the Kappa Architecture compared to the Lambda Architecture?"
    ]
  },
  {
    "id": "ml-2",
    "role": "ML/Data Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a Retrieval-Augmented Generation (RAG) pipeline for enterprise search across millions of documents. How do you handle chunking, embeddings, and reranking?",
    "hint": "Document parsing -> recursive semantic chunking -> dense embedding model -> Vector DB (pgvector/Pinecone) with HNSW index -> hybrid BM25 search -> Cross-Encoder reranker -> LLM context.",
    "sampleAnswer": "The pipeline begins with ingestion: documents (PDFs, docs) are extracted and split using recursive character chunking with semantic heading awareness (500 tokens with 10% overlap). Chunks are embedded using a dense embedding model and stored in a vector database with an HNSW index. On user query, we perform Hybrid Search combining dense vector cosine similarity with sparse BM25 keyword search using Reciprocal Rank Fusion (RRF). Top 50 results pass through a Cross-Encoder reranker to filter the top 5 most relevant passages before prompting the LLM.",
    "keyConceptsToCover": [
      "Semantic chunking strategies",
      "HNSW vector indexing",
      "Hybrid Search (BM25 + Dense)",
      "Cross-Encoder reranking"
    ],
    "followUps": [
      "How do you mitigate hallucinations and lost-in-the-middle phenomena in long contexts?",
      "How do you update vector embeddings when documents are modified in real-time?"
    ]
  },
  {
    "id": "ml-3",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "What is data drift and concept drift in production ML models, and how do you monitor and alert on them?",
    "hint": "Data drift: change in input feature distribution P(X). Concept drift: change in relationship between inputs and targets P(Y|X). Monitored via KS-test, PSI, Evidently AI.",
    "sampleAnswer": "Data drift occurs when the statistical distribution of input features changes over time (P(X)) due to user demographic shifts or seasonal changes, detectable using the Kolmogorov-Smirnov test or Population Stability Index (PSI). Concept drift happens when the actual relationship between inputs and target labels shifts (P(Y|X)), such as fraud patterns evolving. We monitor this in production by comparing baseline training statistics with rolling inference metrics and setting up automated alerts to trigger model retraining pipelines.",
    "keyConceptsToCover": [
      "Feature drift vs Label drift",
      "Population Stability Index (PSI)",
      "Evidently AI / Great Expectations",
      "Automated retraining triggers"
    ],
    "followUps": [
      "How do you evaluate model drift when ground-truth labels are delayed by months?",
      "What is the difference between supervised model retraining and shadow deployments?"
    ]
  },
  {
    "id": "ml-4",
    "role": "ML/Data Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "Your distributed PyTorch model training crashes with a CUDA Out of Memory (OOM) error on epoch 3. How do you troubleshoot and optimize memory?",
    "hint": "Mixed precision training (FP16/BF16), Gradient Accumulation, Activation Checkpointing, ZeRO optimizer stages in DeepSpeed.",
    "sampleAnswer": "First, I check if memory is accumulating across batches due to keeping computation graphs (e.g., storing tensor losses without `.item()`). Next, I enable Automatic Mixed Precision (AMP with BF16/FP16) to halve memory footprint. If model weights and activations still exceed VRAM, I implement Gradient Accumulation with a smaller micro-batch size, utilize Activation Checkpointing to recompute activations during backward pass instead of storing them, and use DeepSpeed ZeRO-Stage 2 or 3 to shard optimizer states across GPUs.",
    "keyConceptsToCover": [
      "Automatic Mixed Precision (AMP BF16)",
      "Gradient Accumulation",
      "Activation Checkpointing",
      "DeepSpeed ZeRO optimizer sharding"
    ],
    "followUps": [
      "What is the difference between Model Parallelism and Data Parallelism?",
      "How does flash attention optimize GPU memory bandwidth?"
    ]
  },
  {
    "id": "ml-5",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how vector indexing works. What is the difference between an Inverted File Index (IVF) and Hierarchical Navigable Small World (HNSW)?",
    "hint": "IVF clusters vector space via k-means and searches neighboring centroids. HNSW creates multi-layered skip-list proximity graphs for fast approximate nearest neighbor (ANN) search.",
    "sampleAnswer": "Exact nearest neighbor search across millions of dense vectors is computationally prohibitive O(N * D). Approximate Nearest Neighbor (ANN) indexes trade slight recall accuracy for 100x query speed. IVF (Inverted File) partitions the vector space into Voronoi cells using K-means clustering; queries only search vectors within the nearest `nprobe` centroids. HNSW (Hierarchical Navigable Small World) builds multi-layer geometric graphs where upper layers act like express skip-lists and bottom layers provide fine-grained nearest neighbor connections, offering superior query recall and latency at the cost of higher RAM consumption.",
    "keyConceptsToCover": [
      "ANN (Approximate Nearest Neighbors)",
      "IVF Voronoi clustering and nprobe",
      "HNSW multi-layer graph navigation",
      "Recall vs Memory trade-off"
    ],
    "followUps": [
      "How does scalar quantization (SQ8) or product quantization (PQ) compress vectors in RAM?",
      "How does cosine similarity compare with dot product when vectors are normalized?"
    ]
  },
  {
    "id": "ml-6",
    "role": "ML/Data Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a Feature Store like Feast for real-time recommendation inference that serves features under 10ms while synchronizing batch warehouse data.",
    "hint": "Dual storage: Online store (Redis/DynamoDB for sub-10ms key-value point lookups) and Offline store (Snowflake/Parquet for point-in-time correct training data).",
    "sampleAnswer": "A Feature Store eliminates train-serve skew by providing a unified definition layer. It maintains two underlying storage tiers: an Offline Store (Parquet/Delta Lake on S3) optimized for high-throughput batch queries with point-in-time correctness to prevent data leakage during training; and an Online Store (Redis or DynamoDB) holding the latest feature vectors keyed by `entity_id` for sub-10ms point lookups during live model inference. Streaming ingestion from Kafka keeps the online Redis store fresh in near real-time.",
    "keyConceptsToCover": [
      "Train-serve skew prevention",
      "Point-in-time correctness (time travel)",
      "Dual storage (Redis online, S3 offline)",
      "Streaming feature ingestion"
    ],
    "followUps": [
      "How does time-travel joining prevent data leakage in training datasets?",
      "How do you handle feature schema evolution over multiple model generations?"
    ]
  },
  {
    "id": "do-1",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the Kubernetes architecture. What are the roles of kube-apiserver, etcd, kube-scheduler, kube-controller-manager, and kubelet?",
    "hint": "Control plane components manage cluster state and schedule pods. Node components run the containers and report telemetry.",
    "sampleAnswer": "The Kubernetes Control Plane consists of `kube-apiserver`, the central REST gateway validating and configuring cluster data; `etcd`, the distributed, consistent key-value store holding cluster state; `kube-scheduler`, which assigns unscheduled pods to optimal worker nodes based on resource constraints; and `kube-controller-manager`, running reconciliation loops to maintain desired state. On worker nodes, `kubelet` ensures containers described in PodSpecs are running and healthy via the Container Runtime Interface (CRI), while `kube-proxy` manages network routing.",
    "keyConceptsToCover": [
      "Control Plane vs Worker Nodes",
      "etcd consistency and quorum",
      "kubelet CRI interaction",
      "Reconciliation loops"
    ],
    "followUps": [
      "What happens to running pods if the Control Plane goes down temporarily?",
      "How does etcd maintain raft consensus during network partitions?"
    ]
  },
  {
    "id": "do-2",
    "role": "DevOps & Cloud Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a zero-downtime Blue/Green and Canary deployment pipeline for a high-traffic microservice using ArgoCD, Istio, and GitHub Actions.",
    "hint": "GitOps with ArgoCD, Istio Service Mesh virtual services, progressive traffic splitting (5% -> 20% -> 100%), automated rollback on error rate spikes.",
    "sampleAnswer": "Developers push to GitHub, triggering CI actions that run tests, scan images with Trivy, and update Kubernetes manifests in a GitOps repository. ArgoCD syncs the new manifest. For Canary releases, Argo Rollouts interacts with Istio Service Mesh via VirtualServices. Istio routes 5% of production traffic to the canary replica. Prometheus monitors error rates and p99 latency for 10 minutes. If error rate exceeds 0.5%, Argo automatically aborts and restores 100% traffic to stable. If metrics remain healthy, traffic shifts to 100%.",
    "keyConceptsToCover": [
      "GitOps with ArgoCD",
      "Canary vs Blue/Green",
      "Istio VirtualService traffic weight",
      "Automated metric analysis & rollback"
    ],
    "followUps": [
      "How do you handle database migrations during Canary deployments where old and new code run simultaneously?",
      "What is the difference between liveness, readiness, and startup probes?"
    ]
  },
  {
    "id": "do-3",
    "role": "DevOps & Cloud Engineer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A Kubernetes pod is stuck in `CrashLoopBackOff`. Walk me through your command-line debugging process to diagnose and fix it.",
    "hint": "kubectl describe pod -> inspect Exit Code (137 = OOMKilled, 1 = App error) -> kubectl logs --previous -> inspect ConfigMaps/Secrets.",
    "sampleAnswer": "I start by running `kubectl describe pod <pod-name>` to inspect Events and container exit status. If the termination reason is `OOMKilled` (Exit code 137), the container exceeded its memory limit and needs increased resources. Next, I inspect application runtime logs using `kubectl logs <pod-name> --previous` to see why the prior container crashed. Common causes include missing environment variables, failing database connectivity, failed readiness probe timeouts, or permission errors on mounted volumes.",
    "keyConceptsToCover": [
      "kubectl describe and events",
      "Exit Code 137 (OOM) vs 1 (Runtime)",
      "kubectl logs --previous",
      "Liveness probe misconfigurations"
    ],
    "followUps": [
      "What is the difference between Exit Code 137 and Exit Code 143?",
      "How do you attach an ephemeral debug container to a running pod?"
    ]
  },
  {
    "id": "do-4",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "What is Infrastructure as Code (IaC) and how does Terraform manage state? What is the danger of state locking failure?",
    "hint": "Terraform state (terraform.tfstate) maps real infrastructure to code definitions. Remote backend (S3) with state locking (DynamoDB) prevents concurrent mutations.",
    "sampleAnswer": "Infrastructure as Code allows teams to define and provision cloud resources declaratively. Terraform maintains a state file (`terraform.tfstate`) that maps code definitions to real-world cloud resource IDs and attributes. In collaborative teams, state is stored in a remote backend (like AWS S3) combined with distributed state locking (like DynamoDB). If state locking fails or is disabled, concurrent `terraform apply` executions can race, overwriting state records and leaving orphaned or duplicate cloud resources.",
    "keyConceptsToCover": [
      "Declarative infrastructure",
      "Terraform state mapping",
      "Remote state locking via DynamoDB",
      "State drift detection (terraform refresh)"
    ],
    "followUps": [
      "How do you handle infrastructure drift when someone manually edits AWS resources in the console?",
      "What is the difference between Terraform modules and workspaces?"
    ]
  },
  {
    "id": "do-5",
    "role": "DevOps & Cloud Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a centralized logging and observability platform for 200 microservices using OpenTelemetry, Prometheus, Grafana, and Loki.",
    "hint": "OpenTelemetry collector sidecars/daemons collect metrics, traces, and logs -> route traces to Jaeger/Tempo, metrics to Prometheus, logs to Loki -> unified Grafana dashboards.",
    "sampleAnswer": "Each Kubernetes node runs an OpenTelemetry Collector DaemonSet alongside microservice sidecars. Applications instrumented with OpenTelemetry SDKs emit traces, metrics, and structured JSON logs. The collector enriches telemetry with Kubernetes metadata (pod name, namespace, git commit). Traces ship to Tempo, metrics scrape into Prometheus, and logs ship to Grafana Loki using index-free log streams. A unified Grafana dashboard correlates telemetry: clicking an error log automatically links to its trace ID and corresponding CPU spike.",
    "keyConceptsToCover": [
      "OpenTelemetry unified specification",
      "Log, Metric, Trace correlation",
      "Index-free log streaming in Loki",
      "Prometheus scrapers & PromQL"
    ],
    "followUps": [
      "How do you manage trace sampling rates to control storage costs in high-throughput systems?",
      "What is the difference between push-based and pull-based metric collection?"
    ]
  },
  {
    "id": "mob-1",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the difference between React Native's New Architecture (Fabric, TurboModules, Bridgeless) and the legacy Bridge architecture.",
    "hint": "Legacy Bridge serialized JSON across an asynchronous thread boundary. New Architecture uses JSI (JavaScript Interface) for synchronous C++ direct memory invocation.",
    "sampleAnswer": "The legacy React Native architecture relied on an asynchronous JSON bridge between JavaScript and Native threads, causing serialization lag and frame drops during fast scrolling or gestures. The New Architecture replaces the bridge with JSI (JavaScript Interface), allowing the JS thread to hold direct C++ object references to native host objects. Fabric provides modern concurrent rendering and synchronous layout measurement, while TurboModules loads native modules lazily on-demand.",
    "keyConceptsToCover": [
      "JSI (JavaScript Interface)",
      "Fabric concurrent renderer",
      "TurboModules lazy loading",
      "Elimination of async bridge serialization"
    ],
    "followUps": [
      "How does Hermes engine improve mobile startup time and memory footprint?",
      "How do you debug native memory leaks in iOS Instruments or Android Studio Profiler?"
    ]
  },
  {
    "id": "mob-2",
    "role": "Mobile App Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an offline-first mobile sync engine for a note-taking application. How do you handle sync queues, network reconnects, and battery optimization?",
    "hint": "Local SQLite/WatermelonDB, delta sync with server revision vectors, WorkManager/BackgroundTasks for battery-efficient sync, exponential retry.",
    "sampleAnswer": "The architecture adheres to local-first principles. Reads and writes execute immediately against a local reactive database (like SQLite/WatermelonDB). Every mutation logs a pending change event with timestamp and sync status ('created', 'updated', 'deleted') to a local sync queue. A background sync manager registers network state listeners. When online, changes batch to the backend using vector clocks. On Android, WorkManager and on iOS, BGTaskScheduler handle battery-conscious background syncing.",
    "keyConceptsToCover": [
      "Local-first SQLite storage",
      "Delta synchronization with vector clocks",
      "WorkManager & BGTaskScheduler",
      "Network reachability listeners"
    ],
    "followUps": [
      "How do you handle conflict resolution when two devices edit the same note simultaneously offline?",
      "How do you securely store authentication tokens on mobile devices?"
    ]
  },
  {
    "id": "mob-3",
    "role": "Mobile App Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Your iOS/Android mobile app experiences severe cold start launch latency (>4 seconds). How do you profile and reduce Time to Interactive (TTI)?",
    "hint": "Profile bundle parsing time, lazy-load heavy native modules, enable Hermes bytecode compilation, defer non-critical SDK initializations (Analytics).",
    "sampleAnswer": "I profile using Android Studio App Startup Profiler and Xcode Instruments (Time Profiler). Common cold start bottlenecks include synchronous SDK initializations in Application `onCreate` / `didFinishLaunchingWithOptions`, heavy JavaScript bundle evaluation, and large image assets. To optimize, I enable Hermes bytecode compilation to skip client-side JS parsing, defer third-party analytics SDK initializations to a background task after the first frame renders, and use dynamic imports for deep screen bundles.",
    "keyConceptsToCover": [
      "Hermes bytecode pre-compilation",
      "Deferred SDK initialization",
      "Cold start vs Warm start",
      "Time to Interactive (TTI) profiling"
    ],
    "followUps": [
      "What is the difference between splash screen holding and native view initialization?",
      "How does ProGuard / R8 code shrinking reduce Android APK size and startup time?"
    ]
  },
  {
    "id": "mob-4",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain Deep Linking in mobile applications. What is the difference between custom URL schemes and Universal Links / App Links?",
    "hint": "Custom schemes (myapp://) lack ownership verification and can be intercepted. Universal Links (iOS) and App Links (Android) use domain association files (apple-app-site-association, assetlinks.json).",
    "sampleAnswer": "Custom URI schemes (e.g. `myapp://profile/123`) register a protocol handler with the OS, but any app can register the same scheme, making them insecure against interception. Universal Links (iOS) and Android App Links use standard HTTPS URLs (e.g. `https://myapp.com/profile/123`) cryptographically verified by hosting an association JSON file on the domain root (`/.well-known/assetlinks.json` or `apple-app-site-association`). The OS verifies the domain ownership upon app installation and routes clicks directly to the native app without opening the browser.",
    "keyConceptsToCover": [
      "Custom URL schemes vs Universal/App Links",
      "apple-app-site-association",
      "assetlinks.json domain verification",
      "Deferred deep linking for new installs"
    ],
    "followUps": [
      "What is deferred deep linking and how does it preserve context through app store installation?",
      "How do you handle navigation routing when the app was killed versus running in background?"
    ]
  },
  {
    "id": "sec-1",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how a Cross-Site Request Forgery (CSRF) attack works versus Cross-Site Scripting (XSS), and how modern defenses (SameSite cookies, CSP) mitigate them.",
    "hint": "CSRF exploits browser ambient authority (sending session cookies with cross-site requests). XSS executes malicious script in victim's browser. Mitigate with SameSite=Lax/Strict, anti-CSRF tokens, Content-Security-Policy.",
    "sampleAnswer": "XSS occurs when an attacker injects malicious JavaScript into a trusted web application, allowing them to steal session tokens, log keystrokes, or mutate the DOM. We mitigate XSS using context-aware output encoding, React JSX escaping, and strict Content-Security-Policy (CSP) headers. CSRF exploits the browser's automatic inclusion of cookies on cross-site requests to perform unauthorized actions on behalf of an authenticated user. We defend against CSRF using `SameSite=Lax` or `Strict` cookies, verifying `Origin`/`Referer` headers, and using cryptographically secure Anti-CSRF tokens.",
    "keyConceptsToCover": [
      "Ambient credential authority",
      "Stored vs Reflected XSS",
      "SameSite cookie attributes",
      "Content-Security-Policy (CSP)"
    ],
    "followUps": [
      "Why does storing JWTs in localStorage make an application vulnerable to XSS token theft?",
      "How does a nonced CSP prevent inline script injection?"
    ]
  },
  {
    "id": "sec-2",
    "role": "Cybersecurity & Systems Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a Zero-Trust Authentication & Authorization Architecture for a multi-tenant enterprise cloud application with SSO, MFA, and RBAC.",
    "hint": "Zero Trust principle ('never trust, always verify'). OpenID Connect / SAML 2.0 for SSO, FIDO2/WebAuthn for hardware MFA, short-lived JWTs with token rotation, and OPA (Open Policy Agent) for RBAC/ABAC.",
    "sampleAnswer": "Under Zero Trust, internal networks are assumed compromised. Authentication relies on OpenID Connect / SAML for corporate SSO, requiring FIDO2 WebAuthn hardware tokens for phishing-resistant MFA. The identity provider issues short-lived JWT access tokens (15-min lifespan) and refresh tokens stored with cryptographic binding and rotation. Authorization uses an Open Policy Agent (OPA) sidecar enforcing fine-grained Role-Based and Attribute-Based Access Control (RBAC/ABAC) evaluated per request, augmented by mutual TLS (mTLS) between all microservices.",
    "keyConceptsToCover": [
      "Zero Trust principle",
      "FIDO2 / WebAuthn MFA",
      "Short-lived JWTs with rotation",
      "Open Policy Agent (OPA) for RBAC/ABAC"
    ],
    "followUps": [
      "How do you revoke a stateless JWT immediately if a user's account is compromised?",
      "What is mutual TLS (mTLS) and how does it prevent man-in-the-middle attacks between microservices?"
    ]
  },
  {
    "id": "sec-3",
    "role": "Cybersecurity & Systems Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "You detect a SQL injection vulnerability in a legacy microservice where raw strings are concatenated into dynamic queries. How do you exploit-proof the code and prevent SQLi at the network/WAF layer?",
    "hint": "Prepared statements with parameterized queries decouple query structure from data values. WAF SQLi inspection rulesets (ModSecurity/Cloudflare), principle of least privilege DB roles.",
    "sampleAnswer": "The root cause of SQL injection is treating untrusted data as executable code through string concatenation. The definitive code-level fix is converting all queries to Prepared Statements with Parameterized Queries, ensuring the SQL query plan is pre-compiled by the database engine and user input is treated strictly as literal data constants. At the defense-in-depth layer, we apply Web Application Firewall (WAF) regex inspection rules, enforce strict input validation schemas, and restrict database connection credentials using least-privilege roles without DDL permissions.",
    "keyConceptsToCover": [
      "Prepared statements & parameterized queries",
      "SQL parsing separation of code vs data",
      "Least-privilege database user permissions",
      "WAF SQLi rule inspection"
    ],
    "followUps": [
      "Can SQL injection still occur when using an ORM like Prisma or Hibernate?",
      "What is blind SQL injection and how do attackers use time delays to exfiltrate data?"
    ]
  },
  {
    "id": "sec-4",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how TLS 1.3 Handshake works, how it achieves 1-RTT (and 0-RTT resumption), and how Perfect Forward Secrecy (PFS) is guaranteed.",
    "hint": "TLS 1.3 eliminates RSA key exchange in favor of Ephemeral Diffie-Hellman (ECDHE). 1-RTT combines ClientHello with key shares. PFS ensures past sessions cannot be decrypted if server private key is leaked.",
    "sampleAnswer": "TLS 1.3 improves latency and security over TLS 1.2 by reducing the handshake to a single round-trip (1-RTT). In the ClientHello, the client proactively includes supported cipher suites AND its Diffie-Hellman key share. The server responds with its own key share in ServerHello, allowing both parties to derive symmetric session keys immediately. TLS 1.3 mandates Ephemeral Diffie-Hellman (ECDHE), providing Perfect Forward Secrecy (PFS): because session keys are ephemeral, a future compromise of the server's long-term private key cannot decrypt previously recorded traffic.",
    "keyConceptsToCover": [
      "1-RTT handshake flow",
      "Ephemeral Diffie-Hellman (ECDHE)",
      "Perfect Forward Secrecy (PFS)",
      "0-RTT session resumption and replay attacks"
    ],
    "followUps": [
      "What security vulnerability exists in 0-RTT resumption and how is it mitigated?",
      "How does Certificate Transparency (CT) prevent fraudulent SSL certificates?"
    ]
  },
  {
    "id": "fe-13",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how modern CSS container queries (@container) differ from media queries (@media) and how they revolutionize component-driven design.",
    "hint": "Media queries evaluate viewport dimensions; container queries evaluate parent container dimensions, allowing true component autonomy.",
    "sampleAnswer": "Media queries query the overall browser viewport width/height, which breaks down in modular component architectures where a card component might sit in a wide main feed or a narrow 300px sidebar. Container queries (@container) allow a component's styles to respond directly to the dimensions of its nearest registered container ancestor (`container-type: inline-size`). This creates self-contained responsive components that adapt wherever they are placed without needing parent context class overrides.",
    "keyConceptsToCover": [
      "container-type: inline-size",
      "Component-driven responsiveness",
      "Elimination of viewport coupling",
      "Container query units (cqw, cqh)"
    ],
    "followUps": [
      "What is the difference between inline-size and normal container types?",
      "How do container query units (cqw/cqh) interact with font scaling?"
    ]
  },
  {
    "id": "fe-14",
    "role": "Frontend Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a state management and offline cache layer for a high-frequency trading or stock portfolio dashboard with live WebSocket price updates.",
    "hint": "Normalize state via TanStack Query / Zustand, throttle incoming WebSocket ticks with requestAnimationFrame, and update only dirty rows via canvas or fine-grained signals.",
    "sampleAnswer": "High-frequency streaming ticks (100+ updates/sec) will choke React reconcilers if state triggers re-renders on the root tree. I architect the store using Zustand or fine-grained Signals with normalized entity IDs. Incoming WebSocket ticks buffer into a high-watermark array and flush at a synchronized 60 FPS interval using `requestAnimationFrame`. Only table rows with mutated prices re-render via targeted selectors or direct DOM canvas updates, while historical candlestick charts render via WebGL.",
    "keyConceptsToCover": [
      "rAF tick batching",
      "Zustand fine-grained selectors",
      "Normalized entity state",
      "WebGL/Canvas offloading for charts"
    ],
    "followUps": [
      "Why does Redux with default useSelector cause re-render storms during high-frequency streams?",
      "How do you detect memory leaks in long-running WebSocket client connections?"
    ]
  },
  {
    "id": "fe-15",
    "role": "Frontend Developer",
    "category": "dsa",
    "difficulty": "hard",
    "question": "Implement a DOM diffing algorithm that computes the minimal edit distance operations to transform one Virtual DOM tree into another.",
    "hint": "Tree edit distance is O(N^3) generally, but React heuristic diffing achieves O(N) by assuming distinct types produce distinct trees and using keys for child lists.",
    "sampleAnswer": "While Zhang-Shasha tree edit distance is O(N^3), virtual DOM reconcilers use heuristic O(N) algorithms based on two assumptions: elements of different types generate different trees (replace subtree entirely), and children across renders are stable when given unique `key` props. For child reconciliation, we maintain an index map of key -> oldNode, iterate the new child list, and track `lastPlacedIndex`. If an old node's index is less than `lastPlacedIndex`, it requires a DOM move operation.",
    "keyConceptsToCover": [
      "React O(N) heuristic assumptions",
      "Key-based child reconciliation",
      "lastPlacedIndex move detection",
      "Tree replacement boundaries"
    ],
    "followUps": [
      "Why are array index keys dangerous when list items can be re-ordered or deleted?",
      "How does the Svelte compiler eliminate virtual DOM diffing entirely?"
    ]
  },
  {
    "id": "fe-16",
    "role": "Frontend Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A web application works flawlessly on Chrome desktop but completely freezes on iOS Safari when users pinch-to-zoom or scroll rapidly. How do you troubleshoot?",
    "hint": "Inspect WebKit specific quirks: inertia momentum scrolling, 100vh dynamic address bar resizing, non-passive touchmove listeners, and iOS hardware memory thresholds.",
    "sampleAnswer": "I connect the iOS device to a Mac using Safari Web Inspector. Common iOS Safari freeze causes include: 1) `window.innerHeight` shifts triggering layout thrashing during address bar expansion (solved using CSS `dvh` units); 2) massive canvas or image memory exceeding iOS WebKit's strict 256MB per-tab limit; and 3) non-passive touchmove event listeners preventing asynchronous GPU momentum scrolling. Adding `{ passive: true }` and replacing 100vh with 100dvh usually resolves the freeze immediately.",
    "keyConceptsToCover": [
      "Safari Web Inspector remote debugging",
      "Dynamic viewport units (dvh vs vh)",
      "WebKit memory limits on canvas",
      "Passive touch listeners"
    ],
    "followUps": [
      "What is the difference between svh, lvh, and dvh in modern CSS?",
      "How does overflow-y: scroll cause iOS rubber-banding glitches?"
    ]
  },
  {
    "id": "fe-17",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how Web Workers and OffscreenCanvas allow moving heavy computational tasks off the main browser UI thread.",
    "hint": "Web Workers run on separate background threads with no DOM access. OffscreenCanvas transfers rendering control via postMessage.",
    "sampleAnswer": "The browser main thread handles JavaScript execution, user interactions, layout, and repaints. Running heavy computations (e.g. image manipulation, cryptography, parsing large CSVs) blocks the main thread, causing UI freezes. Web Workers run scripts in background threads communicating with the main thread via message passing (`postMessage` / `onmessage`). OffscreenCanvas allows transferring a canvas rendering context (`transferControlToOffscreen()`) to a worker, enabling 60 FPS graphic rendering completely decoupled from main thread load.",
    "keyConceptsToCover": [
      "Dedicated Web Workers",
      "postMessage structured cloning",
      "OffscreenCanvas transferControlToOffscreen",
      "SharedArrayBuffer zero-copy transfer"
    ],
    "followUps": [
      "How does SharedArrayBuffer achieve zero-copy data sharing between workers and the main thread?",
      "Why do Spectre mitigations require cross-origin isolation headers for SharedArrayBuffer?"
    ]
  },
  {
    "id": "fe-18",
    "role": "Frontend Developer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you had to redesign a complex frontend workflow based on negative user analytics or session replays.",
    "hint": "Use STAR. Discuss PostHog/Hotjar session recordings, high drop-off rates, simplifying multi-step forms, and measurable conversion gains.",
    "sampleAnswer": "In our onboarding flow, funnel analytics revealed a 48% drop-off at Step 3 (profile configuration). By reviewing session replays, I observed users repeatedly rage-clicking disabled submit buttons and getting stuck on confusing multi-select filters. I led a frontend redesign converting the monolithic form into a progressive disclosure wizard with real-time field validation, smart defaults, and clear inline feedback. Post-release, drop-off decreased from 48% to 14%, resulting in a 26% lift in activated users.",
    "keyConceptsToCover": [
      "Funnel analytics and rage clicks",
      "Progressive disclosure UI patterns",
      "Inline validation vs disabled buttons",
      "Quantified conversion metrics"
    ],
    "followUps": [
      "How do you protect sensitive user PII when recording session replays?",
      "What is the difference between qualitative session recordings and quantitative A/B test data?"
    ]
  },
  {
    "id": "fe-19",
    "role": "Frontend Developer",
    "category": "culture",
    "difficulty": "easy",
    "question": "What is your philosophy on building and maintaining an enterprise Design System shared across multiple product engineering teams?",
    "hint": "Component primitives (Radix/Headless UI), design tokens, accessibility defaults, strict versioning, and living Storybook documentation.",
    "sampleAnswer": "A great design system prioritizes composability and accessibility over rigid monolithic templates. I structure design systems around unstyled accessible primitives (like Radix UI or Headless UI) paired with standardized design tokens (colors, spacing, typography in Tailwind). Every component must pass automated axe-core accessibility tests in CI, provide comprehensive Storybook documentation with interactive props, and follow semantic versioning so product teams can adopt upgrades safely without breaking existing views.",
    "keyConceptsToCover": [
      "Headless component primitives",
      "Design token architecture",
      "Storybook documentation",
      "Semantic versioning and deprecation strategies"
    ],
    "followUps": [
      "How do you prevent product teams from 'breaking out' of the design system with custom CSS overrides?",
      "How do you manage breaking changes in shared component libraries?"
    ]
  },
  {
    "id": "fe-20",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain CSS Specificity calculation, the Cascade Layers (@layer) rule, and how modern CSS architecture eliminates specificity wars.",
    "hint": "Specificity vector (inline, IDs, classes/attributes/pseudo-classes, elements/pseudo-elements). @layer establishes explicit precedence order regardless of selector specificity.",
    "sampleAnswer": "CSS Specificity is calculated as a 4-part tuple: inline styles (1,0,0,0), ID selectors (0,1,0,0), class/attribute/pseudo-class selectors (0,0,1,0), and type/pseudo-element selectors (0,0,0,1). In legacy architectures, this led to specificity wars and `!important` escalation. Modern CSS introduced Cascade Layers (`@layer reset, base, components, utilities`). Explicitly defined layers determine precedence: declarations in a later layer always win over earlier layers, completely bypassing selector specificity calculation.",
    "keyConceptsToCover": [
      "Specificity calculation tuple",
      "CSS Cascade Layers (@layer)",
      "Elimination of !important hacks",
      "Utility-first precedence"
    ],
    "followUps": [
      "How does Tailwind CSS leverage @layer to guarantee utility classes override components?",
      "How does the :where() pseudo-class provide 0-specificity styling?"
    ]
  },
  {
    "id": "fe-21",
    "role": "Frontend Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an asset loading and bundle optimization strategy for a global web app to achieve sub-second load times on 3G mobile networks.",
    "hint": "Route-based dynamic import code splitting, Brotli compression, HTTP/2 multiplexing, responsive AVIF image srcsets, font subsetting, and CDN edge caching.",
    "sampleAnswer": "Achieving sub-second performance on 3G requires minimizing the critical byte payload. I implement route-level code splitting using Next.js dynamic imports so users download only the code required for the current view. All static JS/CSS bundles are compressed with Brotli level 11 and served over HTTP/3 via a global Cloudflare CDN with immutable cache headers. Images use responsive `<picture>` tags serving AVIF/WebP formats resized by edge workers, while critical web fonts are preloaded and subsetted to Latin characters.",
    "keyConceptsToCover": [
      "Brotli compression",
      "Dynamic code splitting",
      "AVIF/WebP responsive srcsets",
      "Font subsetting and preloading"
    ],
    "followUps": [
      "What is the difference between Gzip and Brotli compression ratios?",
      "How does tree-shaking eliminate dead code and why do CommonJS modules hinder it?"
    ]
  },
  {
    "id": "fe-22",
    "role": "Frontend Developer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Write an algorithm to serialize and deserialize an arbitrary DOM tree structure to and from a compact JSON representation.",
    "hint": "Recursive tree traversal: extract tagName, attributes, and recurse children. Handle text nodes (nodeType 3).",
    "sampleAnswer": "To serialize a DOM node, we check `node.nodeType`. If it's a Text Node (type 3), we return `{ type: 'text', value: node.nodeValue }`. If it's an Element (type 1), we extract `tagName: node.tagName.toLowerCase()`, map `attributes` from `node.attributes` into a key-value dictionary, and recursively map `node.childNodes` into a `children` array. Deserialization reverses this: for text nodes, `document.createTextNode()`; for element nodes, `document.createElement()`, set attributes via `setAttribute()`, and recursively append child nodes.",
    "keyConceptsToCover": [
      "DOM NodeTypes (Element 1 vs Text 3)",
      "Recursive tree serialization",
      "Attribute extraction",
      "O(N) traversal complexity"
    ],
    "followUps": [
      "How would you optimize this serialization format to reduce byte size for network transmission?",
      "How do virtual DOM snapshot testing tools utilize DOM serialization?"
    ]
  },
  {
    "id": "be-9",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain database sharding strategies (Range-based, Hash-based, Directory-based). How do you handle cross-shard queries and rebalancing?",
    "hint": "Range sharding causes hot spots on timestamps. Hash sharding (consistent hashing) distributes evenly. Cross-shard joins require scatter-gather or denormalization.",
    "sampleAnswer": "Database sharding horizontally partitions rows across multiple independent database servers. Range-based sharding partitions by contiguous keys (e.g., user IDs 1-1M on Shard 1), which makes range queries efficient but risks hot spots on recent data. Hash-based sharding hashes a partition key (`hash(user_id) % N`), guaranteeing uniform distribution. Cross-shard joins are performance killers, requiring scatter-gather queries coordinated by an application proxy. We mitigate this by co-locating related entity tables on the same shard using composite shard keys or denormalizing data.",
    "keyConceptsToCover": [
      "Horizontal sharding strategies",
      "Consistent hashing & virtual nodes",
      "Scatter-gather query penalties",
      "Co-location via composite shard keys"
    ],
    "followUps": [
      "How does Consistent Hashing minimize data movement when adding or removing database nodes?",
      "What is a two-phase commit (2PC) in distributed transactions across shards?"
    ]
  },
  {
    "id": "be-10",
    "role": "Backend Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an enterprise Change Data Capture (CDC) pipeline using Debezium and Kafka to stream real-time database mutations to Elasticsearch and Snowflake.",
    "hint": "Debezium reads PostgreSQL WAL / MySQL binlog without query overhead -> publishes to Kafka -> sink connectors stream to Elasticsearch and Snowflake.",
    "sampleAnswer": "Query-based polling creates database read spikes and misses deleted rows. A Change Data Capture (CDC) pipeline connects Debezium to PostgreSQL's Write-Ahead Log (WAL) via logical replication slots. Every INSERT, UPDATE, and DELETE event streams directly to a partitioned Kafka topic with zero query impact on the primary OLTP database. Kafka Connect sink workers stream events downstream: an Elasticsearch sink updates search indexes within 100ms, and a Snowflake Snowpipe connector batches records into analytical warehouses.",
    "keyConceptsToCover": [
      "PostgreSQL WAL logical replication",
      "Debezium connector architecture",
      "Kafka topic partitioning by primary key",
      "Real-time search index synchronization"
    ],
    "followUps": [
      "How do you ensure ordered event processing when updating search indexes?",
      "What happens if a schema migration alters a table while the CDC pipeline is actively streaming?"
    ]
  },
  {
    "id": "be-11",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the differences between symmetric encryption (AES-256-GCM) and asymmetric encryption (RSA / Ed25519). When should you use each?",
    "hint": "Symmetric uses same key for encryption/decryption (fast, high volume). Asymmetric uses public/private keypair (slower, used for key exchange & digital signatures).",
    "sampleAnswer": "Symmetric encryption (such as AES-256-GCM) uses a single shared secret key for both encryption and decryption, offering authenticated data encryption with hardware acceleration (AES-NI) that is orders of magnitude faster, making it optimal for database column encryption and TLS data payloads. Asymmetric cryptography (such as RSA-4096 or Ed25519) uses a public/private key pair: the public key encrypts and private key decrypts, or the private key signs and public key verifies. It is ideal for digital signatures, JWT verification, and initial TLS key exchange.",
    "keyConceptsToCover": [
      "AES-256-GCM authenticated encryption",
      "Asymmetric keypairs (Ed25519 / RSA)",
      "Digital signatures vs Data encryption",
      "Hardware-accelerated AES-NI"
    ],
    "followUps": [
      "Why is AES-GCM preferred over AES-CBC?",
      "What is the security difference between RSA and Elliptic Curve Cryptography (ECC)?"
    ]
  },
  {
    "id": "be-12",
    "role": "Backend Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A Redis cluster node fails, and your backend experiences a thundering herd (cache stampede) causing the database to crash. How do you prevent this?",
    "hint": "Mutual exclusion locks (Mutex / Redlock), probabilistic early expiration (XFetch algorithm), pre-warming caches, and circuit breakers.",
    "sampleAnswer": "A cache stampede occurs when a high-traffic cached key expires or its node fails: hundreds of concurrent backend threads experience a cache miss simultaneously and hammer the underlying database to recompute the value. To prevent this, I employ three layers: 1) Mutex locking: on cache miss, only the first thread acquires a short distributed lock in Redis to query the DB and repopulate cache while other requests wait or return stale data; 2) Probabilistic early expiration (the XFetch algorithm): randomly recomputing hot cache keys slightly before TTL expiration; 3) Circuit breakers that shed read traffic if DB CPU exceeds 85%.",
    "keyConceptsToCover": [
      "Cache stampede / Thundering herd",
      "Mutex locking on cache miss",
      "XFetch probabilistic early recomputation",
      "Circuit breaker shedding"
    ],
    "followUps": [
      "How does the XFetch algorithm calculate the recomputation probability?",
      "What is the difference between cache-aside, write-through, and write-behind patterns?"
    ]
  },
  {
    "id": "be-13",
    "role": "Backend Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement a Thread-Safe / Process-Safe Bounded Blocking Queue in Node.js or Go with backpressure.",
    "hint": "In Go: buffered channels with select. In Node: async queue with bounded size and Promise-based wait/notify when capacity is reached.",
    "sampleAnswer": "A bounded blocking queue regulates producer-consumer pipelines to prevent memory exhaustion (backpressure). In Go, this is naturally implemented using a buffered channel `make(chan T, capacity)` where `ch <- item` blocks when full and `<-ch` blocks when empty. In Node.js, we maintain an array with a `maxCapacity` limit and two FIFO arrays of pending resolver callbacks (`waitingProducers` and `waitingConsumers`). When `enqueue()` exceeds capacity, it returns an unresolved Promise stored in `waitingProducers`. When `dequeue()` removes an item, it resolves the oldest waiting producer, resuming stream flow.",
    "keyConceptsToCover": [
      "Bounded buffer backpressure",
      "Producer-consumer synchronization",
      "Promise-based wait-notify lists",
      "Channel blocking mechanics in Go"
    ],
    "followUps": [
      "How do Node.js Streams implement backpressure using the highWaterMark and drain event?",
      "How would you persist this queue across application restarts?"
    ]
  },
  {
    "id": "be-14",
    "role": "Backend Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a high-severity production outage you caused or triaged. How did you diagnose it and what safeguard did you build?",
    "hint": "Use STAR. Own the mistake honestly, discuss rollback mitigation, finding root cause, and building guardrails (linters, pre-commit hooks, CI checks).",
    "sampleAnswer": "During an off-peak deployment, I executed a database migration adding a NOT NULL column without a DEFAULT value on a 20-million-row users table. This triggered an exclusive table lock in PostgreSQL, queuing all incoming web requests and exhausting our API connection pool within 90 seconds. I immediately rolled back the deployment and aborted the migration lock. In the post-mortem, I took ownership and implemented `pg-safe-migrations` in our CI/CD pipeline, which automatically fails any PR containing locking operations without concurrent execution safeguards.",
    "keyConceptsToCover": [
      "PostgreSQL table locks on DDL",
      "Rapid rollback mitigation",
      "Automated migration linting (strong_migrations)",
      "Blameless incident analysis"
    ],
    "followUps": [
      "How do you safely add a NOT NULL column to a large table in PostgreSQL without locking it?",
      "How does zero-downtime database migration work across schema versions?"
    ]
  },
  {
    "id": "be-15",
    "role": "Backend Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a distributed search engine indexer like Elasticsearch that can index 50,000 documents per second with inverted index construction.",
    "hint": "Segment files, in-memory indexing buffer (RAM), Lucene commit log (translog), background segment merging (TieredMergePolicy), and inverted index postings lists.",
    "sampleAnswer": "Incoming documents enter an in-memory buffer while simultaneously appending to an append-only transaction log (translog) for durability. Every 1 second (the refresh interval), the buffer writes an immutable Lucene segment file to the OS filesystem cache, making documents immediately searchable. The core data structure is an Inverted Index containing a sorted Term Dictionary and Postings Lists (sorted lists of document IDs containing the term, compressed using Frame of Reference). In the background, a TieredMergePolicy merges smaller segments into larger ones, purging deleted document tombstones.",
    "keyConceptsToCover": [
      "Inverted Index postings lists",
      "Lucene immutable segments",
      "Translog durability",
      "Tiered merge policy"
    ],
    "followUps": [
      "How does Frame of Reference (FoR) compress postings list integer arrays?",
      "What are the trade-offs between deep pagination (from/size) vs search_after in distributed search?"
    ]
  },
  {
    "id": "be-16",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how Connection Pooling works in relational databases. What happens when your pool is oversized versus undersized?",
    "hint": "DB connections are expensive processes (forking in Postgres, ~10MB RAM per connection). Connection pools (PgBouncer/HikariCP) multiplex client requests.",
    "sampleAnswer": "Establishing a PostgreSQL connection requires TCP handshake, SSL negotiation, and spawning a backend operating system process consuming ~10MB of RAM. Connection poolers (like PgBouncer or HikariCP) maintain a persistent pool of open connections, loaning them to client threads and returning them upon query completion. If the pool is undersized, client requests queue and experience latency timeouts. If the pool is oversized, hundreds of concurrent queries thrash the server's CPU cores and disk I/O, worsening overall system throughput due to context switching.",
    "keyConceptsToCover": [
      "Process-per-connection cost",
      "Transaction-mode connection pooling (PgBouncer)",
      "HikariCP optimal pool sizing formula",
      "Context switching degradation"
    ],
    "followUps": [
      "What is the HikariCP recommended formula for optimal pool size: `connections = (cores * 2) + effective_spindle_count`?",
      "Why does session pooling differ from transaction pooling?"
    ]
  },
  {
    "id": "ml-7",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how model quantization works (FP32 vs FP16 vs INT8 vs INT4 / GGUF). What are the performance and perplexity trade-offs?",
    "hint": "Quantization maps continuous weights to discrete low-bit representations. Post-Training Quantization (PTQ) vs Quantization-Aware Training (QAT).",
    "sampleAnswer": "Standard model training uses 32-bit floating point (FP32) weights. Quantization maps high-precision float values to lower bit representations (FP16, INT8, INT4 / GGUF) via scaling factors and zero-point offsets. This reduces model VRAM footprint by up to 75% and accelerates inference through integer vector arithmetic (INT8 Tensor Cores). The trade-off is slight quantization noise (increased perplexity). Post-Training Quantization (PTQ with AWQ or GPTQ) preserves salient activation outliers, enabling 70B parameter models to run on single consumer GPUs with minimal accuracy loss.",
    "keyConceptsToCover": [
      "Float32 to Int4 scale & zero-point",
      "VRAM reduction & memory bandwidth bound inference",
      "AWQ / GPTQ activation outlier preservation",
      "GGUF format for CPU/GPU offloading"
    ],
    "followUps": [
      "Why are LLMs memory-bandwidth bound rather than compute bound during token generation?",
      "What is Quantization-Aware Training (QAT) compared to Post-Training Quantization?"
    ]
  },
  {
    "id": "ml-8",
    "role": "ML/Data Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an automated model retraining and continuous evaluation pipeline (MLOps) using Kubeflow, MLflow, and Great Expectations.",
    "hint": "Data validation (Great Expectations) -> Kubeflow pipelines -> Distributed training -> Model evaluation on shadow traffic -> MLflow model registry -> Canary rollout.",
    "sampleAnswer": "The pipeline triggers automatically when data drift monitors detect statistical shifts. First, Great Expectations runs data quality assertions on new training partitions; if assertions fail (missing features, unexpected nulls), the pipeline halts and alerts data engineers. If clean, a Kubeflow Pipeline spins up distributed Spot GPU instances to train the model, logging parameters and evaluation loss to MLflow. The trained model is evaluated against a golden benchmark dataset. If it beats production thresholds, it registers as 'Staging' in MLflow and deploys as a shadow model receiving 10% of production traffic for offline evaluation.",
    "keyConceptsToCover": [
      "Data contract validation",
      "Kubeflow pipeline DAG orchestration",
      "MLflow model registry versioning",
      "Shadow model verification before promotion"
    ],
    "followUps": [
      "How do you track artifact lineage from raw data partition to deployed model weights?",
      "What is the difference between data versioning with DVC versus database snapshots?"
    ]
  },
  {
    "id": "ml-9",
    "role": "ML/Data Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "An LLM RAG application frequently hallucinates or answers 'I cannot find the answer' even though the exact facts exist in the knowledge base. How do you debug?",
    "hint": "Evaluate retrieval vs generation failure: inspect chunk boundaries (did the fact get split in half?), embedding similarity score, context window truncation, and prompt instruction conflict.",
    "sampleAnswer": "I decouple the diagnostic into Retrieval Failure versus Generation Failure. First, I inspect the retrieved chunks logged in LangSmith or Traceloop. If the relevant facts are missing from retrieved context, the retrieval failed: possible causes are poor chunking splitting a crucial sentence across chunk boundaries, low cosine similarity due to query-document terminology mismatch (fixable with HyDE or hybrid BM25 search), or an oversized HNSW cluster missing the node. If the facts were retrieved but the LLM hallucinated, the model suffered from context dilution or conflicting system prompt constraints.",
    "keyConceptsToCover": [
      "Retrieval vs Generation failure isolation",
      "Chunk boundary fragmentation",
      "Hypothetical Document Embeddings (HyDE)",
      "Lost in the middle phenomenon"
    ],
    "followUps": [
      "How does Ragas or TruLens calculate faithfulness and answer relevancy scores?",
      "What is Parent Document Retrieval and how does it solve chunking trade-offs?"
    ]
  },
  {
    "id": "ml-10",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how distributed data shuffle works in Apache Spark and how data skew causes straggler tasks in cluster executors.",
    "hint": "Shuffle re-partitions data across nodes via network. Data skew happens when one key has 100x more records than others, making one core do 90% of the work.",
    "sampleAnswer": "In Apache Spark, transformations like `groupByKey`, `reduceByKey`, or joins require a Shuffle: redistributing data across cluster nodes so that all records with the same partition key reside on the same executor partition. Shuffles write intermediate files to local disk and transmit over the network. Data Skew occurs when a partition key (e.g., null values or viral product IDs) has orders of magnitude more rows than other keys. The executor handling that skewed key becomes a 'straggler task' that runs for hours while all other 99 executors sit idle waiting.",
    "keyConceptsToCover": [
      "Spark shuffle write and fetch",
      "Data skew and straggler tasks",
      "Salting technique for skewed keys",
      "Adaptive Query Execution (AQE) skew join"
    ],
    "followUps": [
      "How does key salting eliminate data skew in distributed joins?",
      "How does Spark Adaptive Query Execution (AQE) automatically split skewed partitions at runtime?"
    ]
  },
  {
    "id": "do-6",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain Linux cgroups (control groups) and namespaces. How do they form the fundamental building blocks of Docker and container runtimes?",
    "hint": "Namespaces provide isolation (what a process can see: PID, NET, MNT, IPC, UTS). cgroups provide resource limitation (how much a process can use: CPU, RAM, I/O).",
    "sampleAnswer": "Containers are not virtual machines; they are standard Linux processes isolated by Linux kernel features. Linux Namespaces provide isolation by partitioning system resources so a process only sees its own sandbox: PID namespace isolates process IDs, NET isolates network interfaces, MNT isolates mount points, and IPC isolates inter-process communication. Linux cgroups (Control Groups, cgroups v2) enforce resource limits and accounting: restricting maximum CPU shares, RAM limits (triggering OOM-killer if exceeded), and disk I/O throughput.",
    "keyConceptsToCover": [
      "Linux Namespaces (PID, NET, MNT, UTS, IPC)",
      "cgroups v2 resource metering and limits",
      "Container process model vs Hypervisor VMs",
      "OOM-killer mechanism"
    ],
    "followUps": [
      "What is the difference between cgroups v1 and cgroups v2?",
      "How does rootless containerization improve host security?"
    ]
  },
  {
    "id": "do-7",
    "role": "DevOps & Cloud Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an automated Disaster Recovery (DR) and Backup Architecture across two AWS regions (us-east-1 primary, us-west-2 DR) with RPO < 5 mins and RTO < 15 mins.",
    "hint": "RPO (Recovery Point Objective = data loss tolerance) and RTO (Recovery Time Objective = downtime tolerance). Cross-region Aurora replication, Route 53 DNS failover.",
    "sampleAnswer": "To achieve RPO < 5 mins and RTO < 15 mins, I implement a Warm Standby (or Pilot Light) multi-region architecture. In primary region us-east-1, resources run at full production scale. Database uses Amazon Aurora Global Database with asynchronous storage-level replication to us-west-2 with typical replication lag < 1 second (well under the 5-minute RPO). In us-west-2, a minimal Kubernetes node pool runs critical baseline services with horizontal auto-scalers configured. Amazon Route 53 health checks monitor primary API endpoints: upon failure, Route 53 DNS automated failover shifts traffic to us-west-2 while Terraform/KEDA scales up worker replicas in parallel (RTO < 10 mins).",
    "keyConceptsToCover": [
      "RPO vs RTO definitions",
      "Aurora Global Database replication lag",
      "Route 53 automated health check DNS failover",
      "Warm Standby vs Active-Active"
    ],
    "followUps": [
      "What are the challenges of split-brain in multi-region active-active architectures?",
      "How do you test disaster recovery without impacting live production users?"
    ]
  },
  {
    "id": "do-8",
    "role": "DevOps & Cloud Engineer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A high-traffic web application receives HTTP 502 Bad Gateway during sudden traffic spikes behind an NGINX reverse proxy. How do you triage this?",
    "hint": "502 means NGINX received an invalid response or connection drop from upstream backend. Inspect upstream timeout, worker_connections, and backend backlog queue.",
    "sampleAnswer": "An HTTP 502 Bad Gateway means NGINX successfully accepted the client connection, but the upstream application server either dropped the socket, timed out, or crashed. I check NGINX error logs (`/var/log/nginx/error.log`). Common root causes: 1) `connect() failed (111: Connection refused)` indicates upstream backend crashed or hit max connection backlog; 2) `upstream timed out` indicates upstream threads are hung waiting on database queries; 3) `worker_connections are not enough` means NGINX exhausted file descriptors. I tune `worker_connections`, increase Linux `somaxconn` socket backlog, and scale backend pods.",
    "keyConceptsToCover": [
      "HTTP 502 Bad Gateway vs 504 Gateway Timeout",
      "NGINX upstream socket connection limits",
      "Linux net.core.somaxconn backlog",
      "Backend thread exhaustion"
    ],
    "followUps": [
      "What is the difference between HTTP 502 and HTTP 504?",
      "How do you configure keepalive connections between NGINX and upstream services?"
    ]
  },
  {
    "id": "do-9",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain Docker multi-stage builds. How do you optimize Dockerfiles to minimize image size from 1.5GB down to 80MB and improve cache utilization?",
    "hint": "Separate build environment (Node/SDK) from runtime environment (Alpine/Distroless). Order commands from least to most frequently changed to leverage layer caching.",
    "sampleAnswer": "Standard Dockerfiles leave compilers, devDependencies, and build caches in the final image, bloating images to 1.5GB and increasing security attack surfaces. Multi-stage builds use multiple `FROM` instructions: the first stage (`builder`) installs devDependencies and compiles TypeScript. The final production stage uses a minimal runtime base (like Alpine or Google Distroless) and copies ONLY compiled artifacts (`dist/`) and production dependencies (`node_modules --omit=dev`). To optimize caching, I copy `package.json` and run `npm ci` BEFORE copying source code so dependency layers stay cached across code edits.",
    "keyConceptsToCover": [
      "Multi-stage Docker builds",
      "Google Distroless & Alpine base images",
      "Layer cache invalidation ordering",
      "Attack surface minimization"
    ],
    "followUps": [
      "Why should you never run production containers as the root user?",
      "What is the difference between COPY and ADD in Dockerfiles?"
    ]
  },
  {
    "id": "mob-5",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does Android's Activity and Fragment lifecycle work, and how do you prevent activity recreation state loss during screen rotation?",
    "hint": "Lifecycle: onCreate -> onStart -> onResume -> onPause -> onStop -> onDestroy. State saved in onSaveInstanceState Bundle or Android ViewModel.",
    "sampleAnswer": "An Activity transitions through states: `onCreate` (initialization), `onStart` (visible), `onResume` (interactive in foreground), `onPause` (partially obscured), `onStop` (hidden), and `onDestroy` (reclaimed). Configuration changes like screen rotation destroy and recreate the Activity by default. To preserve state without UI flicker, we retain business state inside an Android Jetpack `ViewModel`, which survives configuration changes because its lifecycle is tied to the ViewModelStore, while lightweight UI transient states are preserved in the `onSaveInstanceState(Bundle)`.",
    "keyConceptsToCover": [
      "Activity lifecycle states",
      "Configuration change recreation",
      "Jetpack ViewModel lifecycle scope",
      "SavedStateHandle / Bundle restoration"
    ],
    "followUps": [
      "What is the difference between onPause and onStop?",
      "How does Android process death differ from configuration change recreation?"
    ]
  },
  {
    "id": "mob-6",
    "role": "Mobile App Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an image upload and caching pipeline in mobile apps that supports resumable chunked uploads, background uploads, and disk LRU caching.",
    "hint": "Image compression on client -> Tus.io or S3 multipart resumable upload -> local disk LRU cache (Glide/Coil) -> background upload workers.",
    "sampleAnswer": "Large mobile photo uploads frequently fail on spotty cellular networks. The architecture client-compresses photos to WebP before upload to save 70% bandwidth. Uploads use the Tus.io resumable upload protocol or S3 Multipart Upload with chunking (5MB chunks), logging upload offset progress to local SQLite. If the network drops or the app is closed, Android WorkManager / iOS NSURLSession background task resumes the upload from the exact byte offset without restarting. Images downloaded from feeds are cached in memory and disk via a two-tier LRU cache (Coil/SDWebImage).",
    "keyConceptsToCover": [
      "Client-side WebP compression",
      "Resumable chunked upload protocol (Tus.io)",
      "WorkManager background uploads",
      "Two-tier Disk/Memory LRU cache"
    ],
    "followUps": [
      "How do you handle background execution limits on iOS (BGTaskScheduler)?",
      "How do you generate blurhash placeholders for instant perceived load?"
    ]
  },
  {
    "id": "mob-7",
    "role": "Mobile App Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A mobile app experiences random crashes in production with 'OutOfMemoryError: Failed to allocate a ... byte allocation with ... free bytes'. How do you diagnose?",
    "hint": "Analyze heap dumps with LeakCanary or Android Studio Memory Profiler. Look for static context references, un-recycled Bitmaps, and retained listeners.",
    "sampleAnswer": "Android OOM errors usually indicate retained Activity contexts or unbounded Bitmap allocations. I integrate LeakCanary in debug builds, which automatically detects when destroyed Activities or Fragments remain retained in memory and outputs the exact GC reference path. Common culprits include passing an Activity `Context` to static singletons or long-running threads (holding the entire view hierarchy in memory) and loading high-resolution uncompressed Bitmaps without downsampling using `BitmapFactory.Options.inSampleSize`.",
    "keyConceptsToCover": [
      "LeakCanary automated heap analysis",
      "Activity context memory retention",
      "Bitmap inSampleSize downsampling",
      "Retained Fragment references"
    ],
    "followUps": [
      "Why should you pass ApplicationContext instead of ActivityContext to background singletons?",
      "What is the difference between strong, soft, and weak references in Java/Kotlin?"
    ]
  },
  {
    "id": "mob-8",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain iOS Memory Management with Automatic Reference Counting (ARC). What are strong, weak, and unowned references, and how do retain cycles happen?",
    "hint": "ARC tracks reference counts at compile time. Retain cycles happen when two objects hold strong references to each other. Broken using weak (optional) or unowned.",
    "sampleAnswer": "iOS uses Automatic Reference Counting (ARC) to insert retain and release calls at compile-time. An object's memory is deallocated when its reference count drops to zero. A Retain Cycle occurs when two objects hold `strong` references to each other (e.g. an Activity holding a delegate and delegate holding strong Activity, or inside closure capture lists `[self]`), preventing reference counts from ever reaching zero. To break retain cycles, parent-to-child relationships use `strong`, while child-to-parent or delegate references use `weak` (zeroing optional) or `unowned`.",
    "keyConceptsToCover": [
      "Automatic Reference Counting (ARC)",
      "Strong reference cycles in closures",
      "weak zeroing pointers",
      "unowned references and memory safety"
    ],
    "followUps": [
      "When should you use unowned instead of weak in Swift?",
      "What does [weak self] guard let self = self else { return } do inside a closure?"
    ]
  },
  {
    "id": "sec-5",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange) works and why PKCE is required for Single-Page Apps and Mobile Apps.",
    "hint": "Public clients cannot securely store a client_secret. PKCE generates code_verifier and code_challenge (SHA-256) to prevent authorization code interception.",
    "sampleAnswer": "In standard OAuth 2.0 Authorization Code flow, the client exchanges the auth code alongside a `client_secret` to obtain tokens. However, Single Page Applications (SPAs) and mobile apps are Public Clients that cannot securely store secrets. PKCE solves this: the client generates a cryptographically random `code_verifier` and hashes it to create a `code_challenge`. The authorization request sends the `code_challenge`. When exchanging the code, the client sends the plaintext `code_verifier`. The authorization server hashes it and verifies it matches the original challenge, preventing intercepted codes from being redeemed.",
    "keyConceptsToCover": [
      "OAuth 2.0 Public Clients",
      "PKCE code_verifier & code_challenge",
      "Mitigating Authorization Code interception",
      "Token exchange lifecycle"
    ],
    "followUps": [
      "Why is the legacy OAuth 2.0 Implicit Flow deprecated in OAuth 2.1?",
      "What is the difference between an ID Token (OIDC) and an Access Token (OAuth 2)?"
    ]
  },
  {
    "id": "sec-6",
    "role": "Cybersecurity & Systems Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a DDoS mitigation and rate-limiting architecture capable of absorbing a 50Gbps volumetric UDP flood and application-layer HTTP flood (L7).",
    "hint": "Edge Anycast network (Cloudflare/AWS Shield) absorbs L3/L4 volumetric floods. WAF, IP reputation, CAPTCHA challenges, and token bucket rate limits protect L7.",
    "sampleAnswer": "Defending against DDoS requires multi-layered defense. Layer 3/4 volumetric floods (like UDP/NTP amplification) exceed single-datacenter bandwidth and must be absorbed at the edge using BGP Anycast routing across hundreds of CDN scrubbing points (AWS Shield / Cloudflare), filtering non-SYN packets. For Layer 7 application floods (HTTP GET/POST storms aimed at database-heavy endpoints), the reverse proxy and WAF enforce dynamic rate limits based on client fingerprints (JA3/TLS fingerprinting and IP reputation), serving progressive cryptographic challenges or Turnstile/CAPTCHA before requests touch backend application clusters.",
    "keyConceptsToCover": [
      "BGP Anycast traffic scrubbing",
      "L3/L4 volumetric vs L7 application floods",
      "JA3/TLS client fingerprinting",
      "Progressive cryptographic challenges"
    ],
    "followUps": [
      "What is a Slowloris attack and how does an event-driven reverse proxy mitigate it?",
      "How does SYN cookies mitigate SYN flood attacks at the TCP layer?"
    ]
  },
  {
    "id": "sec-7",
    "role": "Cybersecurity & Systems Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "You find evidence that an unauthorized actor generated valid administrative JWT tokens without having access to user passwords. How could this happen?",
    "hint": "Inspect JWT library vulnerabilities: 'none' algorithm flaw, algorithm confusion (HMAC using RSA public key as secret), weak HMAC secret brute-forced with hashcat.",
    "sampleAnswer": "Common JWT implementation vulnerabilities that allow arbitrary token forgery: 1) Algorithm Confusion Attack: the backend expects RS256 (asymmetric) with a public key, but the attacker alters the header to HS256 (symmetric HMAC) and signs the token using the server's publicly known RSA public key as the HMAC secret; 2) The 'none' algorithm flaw: vulnerable libraries accept tokens with `alg: 'none'` and skip signature verification entirely; 3) Weak HMAC secret: using a dictionary string (like 'secret123') that was brute-forced offline using Hashcat. Mitigation requires strictly pinning `algorithms: ['RS256']`.",
    "keyConceptsToCover": [
      "JWT Algorithm Confusion (RS256 vs HS256)",
      "The 'none' algorithm bypass vulnerability",
      "Offline HMAC secret brute-forcing",
      "Strict algorithm pinning in JWT verification"
    ],
    "followUps": [
      "How do you implement immediate JWT token revocation if access tokens are stateless?",
      "Why should sensitive user data never be stored unencrypted in JWT claims?"
    ]
  },
  {
    "id": "sec-8",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain Server-Side Request Forgery (SSRF). How does an attacker exploit an image URL upload feature to access cloud metadata (169.254.169.254)?",
    "hint": "SSRF tricks the server into making HTTP requests to internal networks or cloud metadata services. Mitigate with URL validation, private IP blocking, IMDSv2.",
    "sampleAnswer": "SSRF occurs when a web application takes a user-supplied URL (e.g. 'Fetch profile picture from URL') and fetches it without validating destination IP addresses. An attacker inputs `http://169.254.169.254/latest/meta-data/iam/security-credentials/`, the AWS link-local metadata address. The backend server fetches the URL and returns the response, leaking temporary IAM role credentials to the attacker. Mitigations include: disabling HTTP redirects, validating resolved DNS IPs against private IP ranges (RFC 1918 and link-local 169.254/16), and enforcing AWS IMDSv2 which requires session tokens.",
    "keyConceptsToCover": [
      "SSRF (Server-Side Request Forgery)",
      "Cloud metadata endpoint (169.254.169.254)",
      "DNS rebinding attack risks",
      "IMDSv2 session token enforcement"
    ],
    "followUps": [
      "What is a DNS Rebinding attack and how does it bypass naive IP validation in SSRF defenses?",
      "How do you configure network egress policies in Kubernetes to prevent SSRF?"
    ]
  },
  {
    "id": "backend-engineer-system-design-qogme",
    "role": "Backend Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an idempotency layer for distributed payment processing in a microservice architecture.",
    "hint": "Discuss Idempotency-Key header, Redis/Postgres transaction locks, deduplication windows, and handling concurrent requests.",
    "idealAnswer": "When a payment request arrives with an Idempotency-Key header, the API gateway or payment service creates a distributed lock (e.g. Redis SETNX or DB record with UNIQUE key and status PENDING). If a duplicate request arrives while processing, it either waits or receives a 409/in-flight status. Once completed, the final response payload is cached with a 24-48 hour TTL and returned to any identical subsequent requests without re-charging.",
    "keyConceptsToCover": [
      "Idempotency-Key",
      "Distributed Locks",
      "Two-Phase Commit",
      "TTL Cache",
      "Race Conditions"
    ]
  },
  {
    "id": "backend-engineer-core-technical-a1ivk",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does Postgres MVCC (Multi-Version Concurrency Control) work and what are the trade-offs of VACUUM and transaction isolation levels?",
    "hint": "Explain xmin, xmax tuple headers, write amplification, snapshot isolation, and table bloat.",
    "idealAnswer": "Postgres implements concurrency without read locks using MVCC: each tuple stores xmin (creating transaction ID) and xmax (deleting/updating transaction ID). Updates write a new row version rather than modifying in-place. Read queries inspect their transaction snapshot to decide row visibility. Old unreferenced versions become dead tuples; autovacuum scans pages to reclaim dead tuples and freeze transaction IDs to prevent wraparound.",
    "keyConceptsToCover": [
      "MVCC",
      "xmin/xmax",
      "Snapshot Isolation",
      "Table Bloat",
      "Autovacuum"
    ]
  },
  {
    "id": "backend-engineer-dsa-c07ap",
    "role": "Backend Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Explain how you would implement a distributed Rate Limiter using a Sliding Window Counter algorithm.",
    "hint": "Contrast token bucket with sliding window counter using Redis Sorted Sets (ZSET) or hashed time buckets.",
    "idealAnswer": "Using Redis ZSET, each request is stored with the current epoch timestamp as both the score and member (or unique UUID). On each check: 1) ZREMRANGEBYSCORE removes timestamps older than now - window_size; 2) ZCARD counts remaining requests; 3) If count < limit, ZADD the current timestamp and set TTL; otherwise reject with 429 Too Many Requests.",
    "keyConceptsToCover": [
      "Sliding Window Counter",
      "Redis ZSET",
      "Atomicity / Lua Script",
      "Rate Limiting",
      "429 Status"
    ]
  },
  {
    "id": "backend-engineer-debugging-7o11w",
    "role": "Backend Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A Node.js / Go backend service experiences gradual memory leaks and OOM kills every 48 hours. Walk through your systematic root cause analysis.",
    "hint": "Heap dumps, profiling, unclosed event listeners, uncollected closures, database connection pool leaks.",
    "idealAnswer": "1) Analyze metrics: verify RSS vs heap memory growth in Prometheus/Grafana. 2) Capture heap snapshots at 20%, 50%, and 80% memory consumption using v8-profiler or pprof. 3) Compare snapshots to identify retained objects (e.g., event emitter listeners never dereferenced, global caching maps without eviction policies, or unbounded promise queues). 4) Check for unclosed DB connections or streams. 5) Reproduce in staging and patch with weak references or bounded LRU caches.",
    "keyConceptsToCover": [
      "Heap Profiling",
      "OOM Killer",
      "Memory Retainers",
      "Event Emitter Leaks",
      "pprof"
    ]
  },
  {
    "id": "backend-engineer-behavioral-0erw9",
    "role": "Backend Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Describe a production incident where a database deadlock or query spike degraded your API, and how you communicated during the outage.",
    "hint": "Incident response workflow: mitigation, stakeholder updates, blameless post-mortem.",
    "idealAnswer": "During peak traffic, an unindexed foreign key join created lock contention and exhausted connection pools. I immediately declared an incident channel, engaged the SRE lead, rolled back the offending release within 8 minutes, and provided 15-minute status updates to support leads. Afterwards, we conducted a blameless postmortem, added query statement timeouts, and created automated CI linter checks for missing database indexes.",
    "keyConceptsToCover": [
      "Incident Command",
      "Blameless Post-Mortem",
      "Statement Timeout",
      "Connection Pool Tuning"
    ]
  },
  {
    "id": "backend-engineer-culture-fs9zb",
    "role": "Backend Engineer",
    "category": "culture",
    "difficulty": "easy",
    "question": "How do you enforce engineering rigor, test coverage, and API versioning across teams without slowing down delivery velocity?",
    "hint": "Contract testing, OpenAPI specifications, automated CI gates, deprecation strategies.",
    "idealAnswer": "I advocate for API-first design using OpenAPI contracts so frontend and backend teams can develop in parallel against mock servers. We enforce strict CI gates for linting, security scans, and unit/integration coverage, while using semantic versioning and backward-compatible additive changes (e.g. deprecating fields rather than breaking contracts) to maintain rapid cadence without regressions.",
    "keyConceptsToCover": [
      "Contract Testing",
      "OpenAPI",
      "Semantic Versioning",
      "CI Gates",
      "Deprecation Policy"
    ]
  },
  {
    "id": "ml-data-engineer-core-technical-wgflg",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the difference between Data Drift and Concept Drift in ML models deployed in production, and how you monitor each.",
    "hint": "P(X) distribution changes vs P(Y|X) relationship changes. Kolmogorov-Smirnov test, PSI, ground truth latency.",
    "idealAnswer": "Data drift (covariate shift) occurs when input feature distributions P(X) change over time while the mapping P(Y|X) remains stable. Concept drift happens when the underlying statistical relationship between features and target labels P(Y|X) changes (e.g. consumer fraud patterns during pandemic). We monitor data drift in real-time using Population Stability Index (PSI) and KS-tests on incoming inference features, and monitor concept drift by joining delayed ground-truth labels with predictions to track degradation in AUC-ROC or F1.",
    "keyConceptsToCover": [
      "Data Drift",
      "Concept Drift",
      "Population Stability Index",
      "KS-Test",
      "Covariate Shift"
    ]
  },
  {
    "id": "ml-data-engineer-system-design-htt24",
    "role": "ML/Data Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a real-time Feature Store supporting low-latency online inference (<10ms p99) and consistent offline batch training.",
    "hint": "Dual storage engine (Redis/DynamoDB for online, Parquet/S3 for offline), point-in-time correctness to prevent data leakage.",
    "idealAnswer": "A dual-storage architecture (like Feast or Hopsworks) ingests event streams via Kafka. Stream processing (Flink/Spark Streaming) computes point-in-time aggregations and writes low-latency key-value state to Redis or Cassandra for online inference. Simultaneously, features are bulk synced to S3/Delta Lake for historical batch training. An entity-level feature registry guarantees identical transformations and joins features with historical timestamps to prevent future data leakage during training.",
    "keyConceptsToCover": [
      "Feature Store",
      "Point-in-Time Correctness",
      "Data Leakage",
      "Kafka + Flink",
      "Online/Offline Dual Store"
    ]
  },
  {
    "id": "ml-data-engineer-dsa-98mf6",
    "role": "ML/Data Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "How does Approximate Nearest Neighbor (ANN) search work in vector databases (e.g. HNSW, IVF-PQ) for RAG and semantic embeddings?",
    "hint": "Hierarchical Navigable Small World graphs, skip lists analogy, vector quantization, recall vs latency trade-off.",
    "idealAnswer": "Exact kNN requires O(N*D) brute-force cosine distance calculations, which is infeasible at scale. HNSW (Hierarchical Navigable Small World) constructs multi-layer proximity graphs inspired by skip lists: top layers have long-range links for fast coarse routing, and bottom layers contain dense local connections for fine-grained convergence. IVF (Inverted File) clusters vectors into Voronoi cells, querying only candidate centroids, while Product Quantization (PQ) compresses high-dimensional float vectors into compact byte codes to fit in RAM.",
    "keyConceptsToCover": [
      "HNSW",
      "Vector Embeddings",
      "IVF-PQ",
      "Cosine Similarity",
      "Vector Indexing"
    ]
  },
  {
    "id": "ml-data-engineer-debugging-74ldo",
    "role": "ML/Data Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "Your PyTorch training pipeline on a multi-GPU cluster shows only 30% GPU Utilization while GPU memory is at 95%. How do you diagnose and fix this bottleneck?",
    "hint": "DataLoader bottlenecks, CPU preprocessing, pinned memory, num_workers, NCCL distributed communication, mixed precision.",
    "idealAnswer": "Low GPU utilization with high memory indicates compute stalling on data ingestion or communication rather than computation. 1) Use PyTorch Profiler or TensorBoard to inspect trace events: if DataLoader takes 70% of step time, increase num_workers, set pin_memory=True, and pre-cache tokenized datasets to NVMe. 2) Check batch size; if small, use torch.cuda.amp (Automatic Mixed Precision FP16/BF16) to double batch size. 3) In DDP (DistributedDataParallel), verify NCCL all-reduce sync overhead isn't dominating due to slow inter-node network interconnects.",
    "keyConceptsToCover": [
      "PyTorch Profiler",
      "DataLoader Bottleneck",
      "Automatic Mixed Precision (AMP)",
      "DistributedDataParallel",
      "Pinned Memory"
    ]
  },
  {
    "id": "ml-data-engineer-core-technical-qqb4l",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain LoRA (Low-Rank Adaptation) and QLoRA fine-tuning for Large Language Models. Why does decomposing weight matrices preserve capability?",
    "hint": "W + BA where B and A are low-rank matrices (r << d). 4-bit NormalFloat quantization, double quantization, paged optimizers.",
    "idealAnswer": "Full fine-tuning updates all billions of LLM parameters W, requiring immense VRAM for optimizer states. LoRA freezes pretrained weights W0 (d x k) and injects trainable rank decomposition matrices: delta_W = B * A, where B is (d x r) and A is (r x k) with rank r << min(d, k). This reduces trainable parameters by 99%+. QLoRA quantizes the base model into 4-bit NormalFloat (NF4), applies double quantization to shrink quantization constants, and uses paged optimizers to prevent CUDA OOM spikes during gradient checkpoints.",
    "keyConceptsToCover": [
      "LoRA",
      "QLoRA",
      "Rank Decomposition",
      "4-bit Quantization",
      "Optimizer State Memory"
    ]
  },
  {
    "id": "ml-data-engineer-system-design-2vev2",
    "role": "ML/Data Engineer",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Design an automated ETL data pipeline processing 50M clickstream events per day into a Snowflake/BigQuery data lakehouse with idempotency and data quality checks.",
    "hint": "Event ingestion via Kinesis/Kafka, batch staging in S3, dbt transformations, Great Expectations data assertions, partition pruning.",
    "idealAnswer": "Events stream from client SDKs into Kafka/Kinesis, buffered into S3 as raw micro-batch JSON/Parquet files partitioned by date/hour. Airflow or Dagster triggers scheduled ELT jobs into Bronze staging tables in Snowflake. dbt models transform raw records into Silver (cleaned, deduplicated by event_id) and Gold (aggregated business metrics) tables. We execute Great Expectations or dbt tests (null checks, unique keys, schema drift assertions) before swapping swap tables atomically.",
    "keyConceptsToCover": [
      "Medallion Architecture",
      "dbt",
      "Airflow/Dagster",
      "Great Expectations",
      "Partition Pruning"
    ]
  },
  {
    "id": "ml-data-engineer-behavioral-g2284",
    "role": "ML/Data Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a situation where an ML model you deployed performed well in offline cross-validation but failed significantly in production. How did you handle it?",
    "hint": "Target leakage, train-test temporal split vs random split, user feedback loop, prompt recovery.",
    "idealAnswer": "We trained a churn prediction model with 92% offline accuracy using random k-fold cross-validation. In production, accuracy dropped to 65%. Investigating revealed target leakage: an engineer had included a customer support ticket tag that was only created after a user initiated churn. I immediately paused automated notifications, switched to temporal out-of-time splits (train on Month 1-3, test on Month 4), rebuilt feature definitions, and established a feature lineage checklist for all ML models.",
    "keyConceptsToCover": [
      "Target Leakage",
      "Temporal Validation",
      "Model Monitoring",
      "Feature Lineage"
    ]
  },
  {
    "id": "ml-data-engineer-culture-mn6e4",
    "role": "ML/Data Engineer",
    "category": "culture",
    "difficulty": "easy",
    "question": "How do you bridge the communication gap between Data Scientists who prioritize model accuracy and Software Engineers who prioritize low latency and 99.99% reliability?",
    "hint": "Shared metrics (p99 latency + F1 score), standardized model packaging (ONNX, MLflow), cross-functional SLOs.",
    "idealAnswer": "I establish joint SLA/SLO contracts: rather than evaluating models purely on academic metrics like AUC, we evaluate on business impact within a strict 50ms latency and memory budget. We mandate MLflow/ONNX standardized packaging and automated CI benchmarking so data scientists test their model's latency and memory footprint before handing off to platform engineers.",
    "keyConceptsToCover": [
      "ONNX",
      "MLflow",
      "SLAs/SLOs",
      "Model Packaging",
      "Cross-functional Collaboration"
    ]
  },
  {
    "id": "ml-data-engineer-debugging-dj90d",
    "role": "ML/Data Engineer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "In an Apache Spark cluster job, 99 out of 100 tasks finish in 2 minutes, but the last task hangs for 45 minutes before failing. What is causing this and how do you resolve it?",
    "hint": "Data skew, skewed join keys, salting, broadcast join, AQE (Adaptive Query Execution).",
    "idealAnswer": "This classic symptom indicates data skew: one partition holds a disproportionate volume of rows because of a high-cardinality null or skewed join key (e.g. default country or null user_id). Solutions: 1) Enable Spark Adaptive Query Execution (spark.sql.adaptive.skewJoin.enabled=true); 2) Salt the skewed join key by appending a random integer (0..N) to spread rows across partitions; 3) If one table is small, switch to a BroadcastHashJoin to avoid expensive shuffle stages.",
    "keyConceptsToCover": [
      "Data Skew",
      "BroadcastHashJoin",
      "Key Salting",
      "Spark Adaptive Query Execution",
      "Partitioning"
    ]
  },
  {
    "id": "ml-data-engineer-dsa-pui91",
    "role": "ML/Data Engineer",
    "category": "dsa",
    "difficulty": "hard",
    "question": "Explain how you would implement TF-IDF and BM25 ranking from scratch for document retrieval.",
    "hint": "Term frequency, inverse document frequency, document length normalization (k1, b parameters).",
    "idealAnswer": "TF-IDF calculates term frequency * log(total_documents / doc_freq_of_term). While effective, it suffers because term frequency scales linearly. BM25 improves this by introducing saturation and document length normalization: BM25 score = IDF * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * (doc_len / avg_doc_len))). Parameter k1 controls frequency saturation, and b controls penalization for verbose documents.",
    "keyConceptsToCover": [
      "BM25",
      "TF-IDF",
      "Document Length Normalization",
      "Information Retrieval",
      "Inverted Index"
    ]
  },
  {
    "id": "ml-data-engineer-core-technical-o3ma4",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "easy",
    "question": "What is the difference between Columnar storage formats (Parquet, ORC) and Row-based formats (CSV, JSON, Avro) in big data systems?",
    "hint": "OLAP vs OLTP query patterns, column projection, dictionary encoding, compression ratios.",
    "idealAnswer": "Row-based formats (CSV, Avro) store full records contiguously on disk, making them ideal for OLTP point lookups and streaming writes. Columnar formats (Parquet, ORC) organize data by column, enabling projection pushdown (reading only required columns) and predicate pushdown (skipping row groups using min/max stats). Because values of the same type sit together, Parquet achieves superior dictionary and Snappy/ZSTD compression ratios.",
    "keyConceptsToCover": [
      "Parquet",
      "Avro",
      "Column Projection",
      "Predicate Pushdown",
      "Dictionary Encoding"
    ]
  },
  {
    "id": "ml-data-engineer-system-design-kd7f9",
    "role": "ML/Data Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "How would you design a scalable RAG (Retrieval-Augmented Generation) system handling millions of queries with low hallucinations and sub-second latency?",
    "hint": "Hybrid search (BM25 + Dense vector), cross-encoder re-ranking, query expansion, caching, semantic chunking.",
    "idealAnswer": "1) Chunking: Semantic chunking with markdown header hierarchy and overlapping sliding windows. 2) Retrieval: Two-stage retrieval using Hybrid Search (BM25 for keyword precision + Vector search for semantic recall) combined with Reciprocal Rank Fusion (RRF). 3) Re-ranking: Pass top 30 candidates through a lightweight Cross-Encoder model to select top 5 chunks. 4) Caching: Semantic vector cache (GPTCache) to return instant answers for semantically identical questions. 5) Guardrails: Citation validation and hallucination checks before streaming the response.",
    "keyConceptsToCover": [
      "Hybrid Search",
      "Reciprocal Rank Fusion",
      "Cross-Encoder Re-ranking",
      "Semantic Chunking",
      "Semantic Cache"
    ]
  },
  {
    "id": "devops-cloud-engineer-core-technical-0e99v",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how Kubernetes Service Networking, CoreDNS, and kube-proxy (iptables vs IPVS) route traffic to Pods.",
    "hint": "ClusterIP virtual IP, kube-proxy iptables rules / IPVS hashing, DNS resolution of service names, CNI overlay network.",
    "idealAnswer": "A Kubernetes ClusterIP is a virtual IP managed by kube-proxy. When a Pod performs a DNS lookup (e.g. auth-service.default.svc.cluster.local), CoreDNS resolves it to the ClusterIP. When the packet leaves the Pod, the CNI network plugin encapsulates it. On the node, kube-proxy's iptables PREROUTING rules (or IPVS IP hash tables for large clusters) perform DNAT, rewriting the ClusterIP to an active Pod IP chosen via round-robin or random distribution.",
    "keyConceptsToCover": [
      "kube-proxy",
      "iptables / IPVS",
      "ClusterIP",
      "CoreDNS",
      "CNI Plugin"
    ]
  },
  {
    "id": "devops-cloud-engineer-system-design-m8d1i",
    "role": "DevOps & Cloud Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a zero-downtime Blue/Green and Canary deployment architecture on AWS EKS using ArgoCD and Istio Service Mesh.",
    "hint": "GitOps workflow, Istio VirtualServices, progressive traffic splitting (10% -> 25% -> 100%), Prometheus automated rollback on error spikes.",
    "idealAnswer": "ArgoCD monitors the Git repository and synchronizes Kubernetes manifests. When a new image tag is committed, Argo Rollouts deploys the Canary pod set alongside the Stable set. Istio VirtualService initially directs 5% of incoming traffic to the canary. An AnalysisTemplate monitors Prometheus metrics (HTTP 5xx rate and p99 latency) for 10 minutes. If error rate remains < 0.1%, it automatically increases traffic to 25%, 50%, and 100%. If an error threshold is breached, Istio instantly reverts traffic to 0% and Argo terminates the failed canary pods.",
    "keyConceptsToCover": [
      "ArgoCD",
      "Istio VirtualService",
      "Canary Rollouts",
      "Automated Rollback",
      "GitOps"
    ]
  },
  {
    "id": "devops-cloud-engineer-debugging-wr56h",
    "role": "DevOps & Cloud Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A Kubernetes pod gets stuck in CrashLoopBackOff with exit code 137. How do you diagnose and permanently resolve it?",
    "hint": "Exit code 137 = 128 + 9 (SIGKILL / OOMKilled). kubectl describe pod, cgroup memory limits, JVM max heap flag, resource quotas.",
    "idealAnswer": "Exit code 137 means the process was terminated with SIGKILL (signal 9), typically by the Linux kernel OOM killer because container memory exceeded pod resource limits (or node ran out of memory). 1) Run 'kubectl describe pod' and check 'Last State: Terminated, Reason: OOMKilled'. 2) Check application memory usage in Grafana or check whether JVM didn't respect cgroup limits (needs -XX:+UseContainerSupport and -XX:MaxRAMPercentage). 3) Right-size resources: adjust requests/limits and tune garbage collection or patch application memory leaks.",
    "keyConceptsToCover": [
      "CrashLoopBackOff",
      "OOMKilled",
      "Exit Code 137",
      "cgroups",
      "Resource Limits"
    ]
  },
  {
    "id": "devops-cloud-engineer-core-technical-u0msx",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "What is Infrastructure as Code (IaC) State Drift, and how do you detect and prevent it using Terraform or OpenTofu in CI/CD?",
    "hint": "terraform.tfstate, remote backends with S3/DynamoDB locking, terraform plan -detailed-exitcode, drift detection crons.",
    "idealAnswer": "State drift occurs when cloud resources are modified manually in the web console or by external scripts, causing actual infrastructure to diverge from the declared terraform.tfstate file. To prevent this: 1) Enforce read-only cloud permissions for humans, routing all changes through CI/CD pipelines. 2) Use remote backends (S3 with DynamoDB locking) to prevent concurrent state corruption. 3) Schedule recurring daily CI jobs running 'terraform plan -detailed-exitcode' to notify teams on Slack if uncommitted drift occurs.",
    "keyConceptsToCover": [
      "State Drift",
      "Terraform tfstate",
      "State Locking",
      "Drift Detection",
      "GitOps"
    ]
  },
  {
    "id": "devops-cloud-engineer-system-design-vs50s",
    "role": "DevOps & Cloud Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Architect a resilient multi-region disaster recovery strategy (Active-Active or Active-Passive Pilot Light) with RTO < 5m and RPO < 1m.",
    "hint": "Route 53 latency/failover routing, Aurora Global Database, S3 cross-region replication, health checks.",
    "idealAnswer": "We deploy an Active-Passive Warm Standby architecture across us-east-1 and us-west-2. Amazon Route 53 health checks monitor region availability and automatically flip DNS failover records within 60 seconds if health checks fail. For data: Amazon Aurora Global Database provides asynchronous storage-level replication with lag < 1 second (RPO < 1m). S3 Cross-Region Replication (CRR) syncs object storage. In the backup region, auto-scaling groups scale up instantly upon DNS failover, achieving RTO < 5 minutes.",
    "keyConceptsToCover": [
      "RTO and RPO",
      "Active-Passive Pilot Light",
      "Aurora Global Database",
      "Route 53 DNS Failover",
      "Cross-Region Replication"
    ]
  },
  {
    "id": "devops-cloud-engineer-dsa-grlm5",
    "role": "DevOps & Cloud Engineer",
    "category": "dsa",
    "difficulty": "easy",
    "question": "Write a bash/python one-liner or algorithm to parse a 10GB Nginx access.log and output the top 10 IP addresses causing 500 Internal Server Errors.",
    "hint": "awk filtering on status code column, sort, uniq -c, sort -rn, head -n 10.",
    "idealAnswer": "Using standard Linux streaming utilities to avoid loading the entire 10GB file into RAM: 'grep \" 500 \" access.log | awk \"{print \\$1}\" | sort | uniq -c | sort -rn | head -n 10'. In Python, we stream the file line by line using a collections.Counter dictionary with regex matching to keep memory consumption at O(unique_ips).",
    "keyConceptsToCover": [
      "Log Parsing",
      "awk/grep/uniq",
      "Memory Streaming",
      "Counter Algorithm",
      "CLI Optimization"
    ]
  },
  {
    "id": "devops-cloud-engineer-debugging-rnwl7",
    "role": "DevOps & Cloud Engineer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "An application in a private subnet on AWS cannot pull Docker images from Docker Hub or communicate with external APIs. What network layers do you check?",
    "hint": "Route table, NAT Gateway, Security Groups, Network ACLs, VPC Endpoints, DNS resolution.",
    "idealAnswer": "1) Route Table: verify the private subnet's route table has 0.0.0.0/0 pointing to an active NAT Gateway in a public subnet. 2) NAT Gateway: verify the NAT Gateway has an Elastic IP and the public subnet has an Internet Gateway (IGW) route. 3) Security Groups & NACLs: check outbound egress rules allow port 443; ensure NACLs allow ephemeral inbound return ports (1024-65535). 4) DNS: verify enableDnsSupport and enableDnsHostnames are true on the VPC.",
    "keyConceptsToCover": [
      "NAT Gateway",
      "Route Tables",
      "VPC Subnets",
      "Security Groups vs NACLs",
      "Internet Gateway"
    ]
  },
  {
    "id": "devops-cloud-engineer-core-technical-6yqv0",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how Linux namespaces and cgroups underpin Docker and Containerd containerization.",
    "hint": "PID, NET, MNT, IPC, UTS, USER namespaces for isolation; cgroups v1/v2 for CPU/memory/IO resource quota enforcement.",
    "idealAnswer": "Containers are not virtual machines; they are standard Linux processes isolated by kernel primitives. Namespaces provide isolation: PID namespace isolates process trees, NET namespace isolates network interfaces and routing tables, MNT isolates mount points via chroot/pivot_root, and USER isolates UID/GID. Control Groups (cgroups v2) enforce resource limits and accounting: rationing maximum CPU shares, memory limits, and I/O bandwidth so a single runaway container cannot starve host resources.",
    "keyConceptsToCover": [
      "Namespaces (PID, NET, MNT)",
      "cgroups v2",
      "pivot_root",
      "Kernel Isolation",
      "Container Runtimes"
    ]
  },
  {
    "id": "devops-cloud-engineer-behavioral-9x9yz",
    "role": "DevOps & Cloud Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a high-severity production outage you managed. How did you triage under pressure and keep calm?",
    "hint": "Establish incident commander, focus on mitigation first over root cause, clear communication, retrospective.",
    "idealAnswer": "During a major cloud certificate expiration, all customer checkouts started throwing SSL handshake errors. I stepped up as Incident Commander, muted chaotic banter in the main channel, and created a dedicated triage war room with one comms lead and two engineers. We focused strictly on mitigation: rotating the wildcard cert via AWS ACM and restarting ingress pods, restoring service within 12 minutes. We held root cause analysis until after traffic stabilized.",
    "keyConceptsToCover": [
      "Incident Commander",
      "Triage & Mitigation",
      "Clear Communication",
      "SSL Rotation"
    ]
  },
  {
    "id": "devops-cloud-engineer-culture-75gm6",
    "role": "DevOps & Cloud Engineer",
    "category": "culture",
    "difficulty": "easy",
    "question": "How do you foster a 'Shift Left' security culture among developers without becoming a blocker to feature releases?",
    "hint": "SAST/DAST in CI, secret scanning pre-commit hooks, automated dependency updates (Dependabot/Renovate), developer champions.",
    "idealAnswer": "Shift Left means making security automated, immediate, and actionable for developers rather than an end-of-quarter audit roadblock. We integrate secret scanning pre-commit hooks (TruffleHog) so keys never reach git, add automated dependency security PRs (Renovate/Dependabot), and configure SonarQube/Snyk SAST in CI with non-blocking warnings that only fail builds on critical CVSS >= 8 vulnerabilities.",
    "keyConceptsToCover": [
      "Shift Left",
      "DevSecOps",
      "SAST/DAST",
      "Secret Scanning",
      "Automated Dependency Updates"
    ]
  },
  {
    "id": "devops-cloud-engineer-system-design-8hak4",
    "role": "DevOps & Cloud Engineer",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Design an observability stack using Prometheus, Grafana, OpenTelemetry, and Loki for a microservices cluster.",
    "hint": "Metrics, logs, traces correlation using trace_id, OpenTelemetry collector, long-term metric storage (Thanos/Cortex).",
    "idealAnswer": "Applications export unified telemetry using the OpenTelemetry SDK (traces, metrics, logs) with automatic W3C traceparent context propagation. The OpenTelemetry Collector receives the data and distributes: 1) Metrics to Prometheus (with Thanos for long-term S3 storage); 2) Structured logs to Grafana Loki indexed by labels; 3) Distributed traces to Tempo or Jaeger. In Grafana, a single dashboard allows an engineer to click a latency spike in Prometheus, jump directly to the offending trace in Tempo, and view correlated container logs in Loki via shared trace_id.",
    "keyConceptsToCover": [
      "OpenTelemetry",
      "Prometheus & Thanos",
      "Grafana Loki",
      "Distributed Tracing",
      "Telemetry Correlation"
    ]
  },
  {
    "id": "devops-cloud-engineer-core-technical-veqb6",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "easy",
    "question": "What is the difference between Docker COPY and ADD instructions, and why is COPY preferred in multi-stage builds?",
    "hint": "ADD unpacks local tar archives and fetches remote URLs, introducing caching and security risks; COPY is explicit.",
    "idealAnswer": "COPY simply copies local files/directories from the build context into the container filesystem. ADD does that but also automatically extracts local tar/gzip archives and can fetch files from remote URLs, which introduces security risks and unpredictability. Best practice is to use COPY for determinism and utilize multi-stage builds where artifacts are compiled in a builder image and cleanly copied to a minimal alpine/distroless production image.",
    "keyConceptsToCover": [
      "Multi-Stage Dockerfile",
      "COPY vs ADD",
      "Layer Caching",
      "Distroless Images",
      "Image Optimization"
    ]
  },
  {
    "id": "devops-cloud-engineer-debugging-b56tk",
    "role": "DevOps & Cloud Engineer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Your CI/CD pipeline build times have increased from 4 minutes to 35 minutes over the past 6 months. How do you optimize it?",
    "hint": "Docker buildx cache-from/cache-to, dependency caching (npm/pip), parallelized test execution, monorepo affected-only builds.",
    "idealAnswer": "1) Enable remote Docker layer caching using buildx with GitHub Actions or S3 cache backend. 2) Cache package manager dependency directories (~/.npm, ~/.cache/pip) keyed on package-lock hashes. 3) Split test execution into parallel worker matrices across test suites. 4) Use monorepo tools like Nx or Turborepo to build and test only affected packages rather than the entire monorepo on every commit.",
    "keyConceptsToCover": [
      "Docker Layer Caching",
      "Dependency Caching",
      "Test Parallelization",
      "Turborepo / Nx",
      "CI Pipeline Optimization"
    ]
  },
  {
    "id": "mobile-app-developer-core-technical-rzh0b",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the difference between React Native's New Architecture (TurboModules, Fabric renderer, JSI) and the old Bridge architecture.",
    "hint": "Synchronous C++ JSI bindings vs asynchronous serialized JSON bridge, concurrent rendering, fabric UI tree.",
    "idealAnswer": "In the legacy architecture, JavaScript and Native code communicated through an asynchronous JSON bridge that serialized and deserialized messages, causing performance bottlenecks and frame drops during fast scrolls. The New Architecture uses JSI (JavaScript Interface), allowing JavaScript to hold direct C++ object references and invoke native methods synchronously. Fabric replaces the old UI manager with direct C++ shadow tree updates compatible with React 18 Concurrent features, while TurboModules loads native modules lazily on-demand.",
    "keyConceptsToCover": [
      "React Native JSI",
      "Fabric Renderer",
      "TurboModules",
      "JSON Bridge",
      "C++ Core"
    ]
  },
  {
    "id": "mobile-app-developer-system-design-z090f",
    "role": "Mobile App Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an Offline-First mobile architecture with background sync, optimistic UI updates, and conflict resolution.",
    "hint": "Local SQLite/WatermelonDB/Realm, optimistic UI state, sync engine with vector clocks or last-write-wins, background job scheduler.",
    "idealAnswer": "1) Local Single Source of Truth: All UI reads and writes interact directly with a local encrypted SQLite/WatermelonDB database. 2) Optimistic UI: The UI updates immediately upon user interaction with a 'sync_status: pending' flag. 3) Sync Queue: Changes are enqueued into a durable sync queue. When network connectivity is detected (via WorkManager on Android or BGTaskScheduler on iOS), the sync engine batches payloads to the backend. 4) Conflict Resolution: Use server-managed timestamps or CRDTs (Conflict-Free Replicated Data Types) to resolve conflicts without data loss.",
    "keyConceptsToCover": [
      "Offline-First",
      "Optimistic UI",
      "WorkManager / BGTaskScheduler",
      "Conflict Resolution",
      "WatermelonDB"
    ]
  },
  {
    "id": "mobile-app-developer-core-technical-003a6",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "In Flutter, explain the difference between the Widget tree, Element tree, and RenderObject tree, and how Flutter achieves 60/120 FPS.",
    "hint": "Immutable widget configuration, element lifecycle management, render object layout and paint.",
    "idealAnswer": "1) Widget Tree: Immutable lightweight blueprints describing UI configurations. 2) Element Tree: Mutable lifecycle managers that hold state and link widgets to render objects, determining whether a widget needs re-rendering or can be updated in-place via element.update(). 3) RenderObject Tree: Heavyweight objects that compute exact layout geometry, hit-testing, and paint operations to the Skia/Impeller canvas. Because Flutter reuses elements and avoids re-allocating RenderObjects unnecessarily, it achieves smooth 60/120 FPS rendering.",
    "keyConceptsToCover": [
      "Widget Tree",
      "Element Tree",
      "RenderObject Tree",
      "Impeller Engine",
      "Flutter Rendering Pipeline"
    ]
  },
  {
    "id": "mobile-app-developer-debugging-nswt1",
    "role": "Mobile App Developer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A mobile app experiences UI stutter and dropped frames (jank) during list scrolling on low-end devices. How do you profile and eliminate it?",
    "hint": "FlatList / RecyclerView recycling, image memory optimization, heavy JS thread execution, un-memoized item renders.",
    "idealAnswer": "1) Profile using React Native Performance Monitor or Android Studio Profiler to determine if dropped frames are on the JS thread or UI thread. 2) If JS thread is blocked: memoize renderItem with React.memo, remove inline arrow functions, and offload expensive calculations to Web Workers or native threads. 3) For images: downsample images to display dimensions using FastImage/Glide, enable disk caching, and specify getItemLayout on FlatList so the list engine doesn't calculate row heights dynamically.",
    "keyConceptsToCover": [
      "UI Jank / Dropped Frames",
      "FlatList Optimization",
      "React.memo",
      "Image Downsampling",
      "Systrace / Profiler"
    ]
  },
  {
    "id": "mobile-app-developer-dsa-rkvy7",
    "role": "Mobile App Developer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "How would you implement an LRU memory cache for mobile image thumbnails with a strict 50MB budget?",
    "hint": "Doubly Linked List + HashMap, measuring byte size of bitmaps, evicting least recently used nodes when memory exceeds threshold.",
    "idealAnswer": "An LRU cache uses a Doubly Linked List of image nodes paired with a HashMap for O(1) lookups. Each node contains the image key and bitmap byte size. When an image is accessed or added, it is moved to the head of the list. If inserting a new image pushes current memory over 50MB, we repeatedly remove the tail node from the list and delete it from the HashMap, recycling the bitmap memory until total memory <= 50MB.",
    "keyConceptsToCover": [
      "LRU Cache",
      "Doubly Linked List",
      "Bitmap Memory Management",
      "O(1) Access",
      "Memory Constraints"
    ]
  },
  {
    "id": "mobile-app-developer-core-technical-xltei",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "easy",
    "question": "Explain the iOS and Android permission models, specifically background location tracking and runtime permissions.",
    "hint": "Foreground vs background permission requests, rationale dialogs, privacy disclosures, iOS 'When In Use' vs 'Always'.",
    "idealAnswer": "Both iOS and Android require runtime permissions for sensitive capabilities (Camera, Mic, Location). For location, platforms enforce two-tiered approval: users must first grant 'While In Use' (foreground) location. Apps cannot directly request 'Always / Background' location without first establishing user trust and displaying a contextual rationale. Background location requires declaring special foreground services on Android and background mode capabilities in Info.plist on iOS, subject to strict App Store review.",
    "keyConceptsToCover": [
      "Runtime Permissions",
      "Background Location",
      "Foreground Service",
      "Info.plist / AndroidManifest",
      "App Store Privacy Review"
    ]
  },
  {
    "id": "mobile-app-developer-system-design-tpqnv",
    "role": "Mobile App Developer",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Design a push notification pipeline supporting millions of devices with deep linking and notification categorization.",
    "hint": "APNs (Apple Push Notification service), FCM (Firebase Cloud Messaging), token invalidation, deep link routing schema.",
    "idealAnswer": "The mobile app registers with APNs/FCM on launch, receives a device push token, and syncs it with our user backend. Notifications are categorized (marketing vs transactional) to respect user notification settings. In the payload, we attach a custom deep-link URI (e.g. `myapp://interview/turn/4`). The app's root router handles app-launch and background-notification-tap events by parsing the URI and navigating directly to the targeted view state.",
    "keyConceptsToCover": [
      "APNs & FCM",
      "Device Push Tokens",
      "Deep Linking",
      "Notification Payloads",
      "Navigation Routing"
    ]
  },
  {
    "id": "mobile-app-developer-debugging-ie31q",
    "role": "Mobile App Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Your app suffers from intermittent crashes on iOS due to EXC_BAD_ACCESS (SIGSEGV / memory corruption). How do you trace it?",
    "hint": "Zombie objects, memory deallocation, Xcode Instruments (Leaks, Zombies), Swift/Obj-C ARC bridge.",
    "idealAnswer": "EXC_BAD_ACCESS occurs when code attempts to access a pointer that references deallocated or invalid memory. 1) Open Xcode and enable 'Zombie Objects' in the Scheme Diagnostics, which replaces deallocated objects with sentinels that log when accessed. 2) Run Xcode Instruments with the 'Allocations' and 'Leaks' templates to detect dangling pointers and unmanaged memory cycles in C++/Objective-C bridging code. 3) Inspect retain cycles (strong reference cycles) in closures and replace strong captures with [weak self].",
    "keyConceptsToCover": [
      "EXC_BAD_ACCESS",
      "Zombie Objects",
      "Xcode Instruments",
      "Strong Reference Cycles",
      "weak self"
    ]
  },
  {
    "id": "mobile-app-developer-behavioral-3qpl6",
    "role": "Mobile App Developer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time an urgent release had to be rolled out to fix a critical mobile bug, but App Store / Google Play review times stood in the way.",
    "hint": "CodePush / OTA (Over-The-Air) updates, remote feature flags, expedited review request.",
    "idealAnswer": "A critical bug caused payment screens to crash for users in Europe. Because App Store review takes 24 hours, we used two strategies: 1) We immediately toggled a remote LaunchDarkly feature flag to route European users to a responsive web checkout fallback. 2) For the native fix, we submitted an Expedited App Review request to Apple explaining the financial impact, while deploying an OTA JS bundle via CodePush to immediately fix React Native users within 15 minutes.",
    "keyConceptsToCover": [
      "Over-The-Air (OTA) Updates",
      "CodePush",
      "Feature Flags",
      "Expedited App Review",
      "Zero-Downtime Hotfix"
    ]
  },
  {
    "id": "mobile-app-developer-culture-lbh9g",
    "role": "Mobile App Developer",
    "category": "culture",
    "difficulty": "easy",
    "question": "How do you maintain design system consistency between Android Material Design and iOS Human Interface Guidelines?",
    "hint": "Cross-platform tokenized design systems, platform-specific adaptations (bottom sheets vs action sheets), Figma token sync.",
    "idealAnswer": "We use a unified design token system (colors, typography scales, spacing) shared in Figma and generated into code via Style Dictionary. However, we avoid forcing an identical 1:1 clone across platforms; we respect platform-native conventions (e.g. iOS swipe-to-back and native bottom action sheets, Android back gesture and floating action buttons) to ensure the app feels intuitive to users of both ecosystems.",
    "keyConceptsToCover": [
      "Design Tokens",
      "Material Design vs HIG",
      "Style Dictionary",
      "Platform Conventions",
      "Design Systems"
    ]
  },
  {
    "id": "mobile-app-developer-core-technical-lruje",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "How do you protect mobile applications against reverse engineering, API tampering, and man-in-the-middle (MITM) attacks?",
    "hint": "SSL/TLS certificate pinning, ProGuard/R8 obfuscation, root/jailbreak detection, Keychain/EncryptedSharedPreferences.",
    "idealAnswer": "1) Code Security: Enable R8/ProGuard code shrinking, name obfuscation, and string encryption in production builds. 2) Network Security: Implement SSL/TLS Public Key Pinning (using trust anchors or Network Security Config) to block MITM proxy tools like Charles or Burp Suite. 3) Storage: Store sensitive tokens in iOS Keychain and Android EncryptedSharedPreferences (backed by Android Keystore hardware security module). 4) Integrity: Use Google Play Integrity API and Apple DeviceCheck to detect rooted/jailbroken devices.",
    "keyConceptsToCover": [
      "SSL Pinning",
      "R8 / ProGuard Obfuscation",
      "Keychain / Keystore",
      "Root / Jailbreak Detection",
      "Play Integrity"
    ]
  },
  {
    "id": "mobile-app-developer-system-design-oobpf",
    "role": "Mobile App Developer",
    "category": "system-design",
    "difficulty": "medium",
    "question": "How would you design a robust mobile analytics and crash reporting SDK with zero impact on battery life and network bandwidth?",
    "hint": "Event batching, gzip compression, exponential backoff, persistent local SQLite queue, capturing unhandled exceptions.",
    "idealAnswer": "Events are queued into an encrypted local SQLite table rather than making immediate HTTP calls. A background dispatcher flushes events every 30 seconds or when the queue reaches 50 events, compressing the JSON payload with Gzip. For crashes, unhandled exception handlers (Thread.setDefaultUncaughtExceptionHandler / NSSetUncaughtExceptionHandler) write crash traces synchronously to disk before the process terminates, and send them on next launch.",
    "keyConceptsToCover": [
      "Crash Reporting",
      "Event Batching",
      "Gzip Compression",
      "Uncaught Exception Handler",
      "Battery Optimization"
    ]
  },
  {
    "id": "mobile-app-developer-dsa-09g2u",
    "role": "Mobile App Developer",
    "category": "dsa",
    "difficulty": "easy",
    "question": "Design a data structure or algorithm to efficiently calculate and render nested comment threads in a social media mobile feed.",
    "hint": "Tree traversal (DFS), flattening tree with depth metadata for virtualized list rendering.",
    "idealAnswer": "In a mobile virtualized list (FlatList or RecyclerView), rendering recursive nested components degrades performance. Instead, we flatten the hierarchical tree into a 1D array using Depth-First Search (DFS). Each flattened item carries its comment data, depth level (for indent padding), and hasChildren/isCollapsed flags. Collapsing a comment simply filters out child nodes whose parentIds match the collapsed node in O(N) time.",
    "keyConceptsToCover": [
      "Tree Flattening",
      "DFS Traversal",
      "Virtualized List Performance",
      "Comment Threading",
      "Recursion"
    ]
  },
  {
    "id": "mobile-app-developer-debugging-gw7az",
    "role": "Mobile App Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Users report that your mobile app drains their battery significantly even when running in the background. How do you isolate the culprit?",
    "hint": "Wake locks, aggressive background polling, continuous GPS updates, Battery Historian / Energy Log in Xcode.",
    "idealAnswer": "1) Use Android Battery Historian and Xcode Energy Log to inspect wake locks and energy impact. 2) Verify background location: ensure the app isn't maintaining high-accuracy GPS listeners; switch to significant-change location or geofences. 3) Replace background timers and network polling with Push Notifications or OS-level scheduled jobs (JobScheduler/WorkManager) that batch tasks when the device is connected to power and Wi-Fi.",
    "keyConceptsToCover": [
      "Battery Historian",
      "Wake Locks",
      "Energy Profiling",
      "Significant-Change Location",
      "WorkManager"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-core-technical-utban",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how memory corruption vulnerabilities (Buffer Overflow, Use-After-Free) are exploited and how modern mitigations (ASLR, DEP/NX, Stack Canaries) stop them.",
    "hint": "Overwriting EIP/RIP, return-oriented programming (ROP), address space randomization, non-executable stack.",
    "idealAnswer": "A buffer overflow occurs when unchecked input writes past allocated stack memory, overwriting the saved Return Pointer (EIP/RIP) to redirect execution to attacker shellcode. Modern mitigations counter this: 1) Stack Canaries place random sentinel values before the return pointer; if corrupted, the program halts immediately. 2) DEP/NX marks stack/heap memory pages as non-executable. 3) Attackers bypass DEP using ROP (Return-Oriented Programming) by chaining existing code gadgets. 4) ASLR (Address Space Layout Randomization) randomizes base memory addresses of the binary, stack, and libraries upon each launch, making gadget addresses unpredictable.",
    "keyConceptsToCover": [
      "Buffer Overflow",
      "Use-After-Free",
      "ASLR",
      "DEP/NX",
      "Return-Oriented Programming (ROP)"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-system-design-eos5w",
    "role": "Cybersecurity & Systems Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a Zero-Trust Architecture (ZTA) for an enterprise microservice infrastructure according to NIST SP 800-207 guidelines.",
    "hint": "Never trust, always verify; mutual TLS (mTLS) with SPIFFE/SPIRE, micro-segmentation, identity-aware proxies, continuous authorization.",
    "idealAnswer": "Zero-Trust assumes the internal network is inherently hostile. 1) Identity: Every workload is issued a cryptographic X.509 identity via SPIFFE/SPIRE with short-lived SVID certificates. 2) Communication: All inter-service communication requires mutual TLS (mTLS) with strict cipher suites. 3) Access Control: Micro-segmentation with Open Policy Agent (OPA) evaluates attributes (workload identity, caller role, request payload, time) for every individual RPC call. 4) Perimeter: External access is mediated via an Identity-Aware Proxy (IAP) requiring multi-factor authentication and device health attestation.",
    "keyConceptsToCover": [
      "Zero-Trust (ZTA)",
      "mTLS",
      "SPIFFE/SPIRE",
      "Open Policy Agent (OPA)",
      "Micro-segmentation"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-core-technical-6pvoo",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does OAuth 2.0 with PKCE (Proof Key for Code Exchange) prevent authorization code interception attacks in Single Page Apps and Native Mobile Apps?",
    "hint": "Code verifier, code challenge (SHA-256), public clients lacking client secrets.",
    "idealAnswer": "Public clients cannot securely store a static client secret. Without PKCE, a malicious app on the device could register the same custom URI scheme and intercept the returned Authorization Code. With PKCE: 1) The client generates a cryptographic high-entropy random string (code_verifier) and hashes it to produce code_challenge = SHA256(code_verifier). 2) The initial /authorize request sends the code_challenge. 3) When redeeming the code at /token, the client sends the plain code_verifier. The authorization server hashes it and verifies it matches the original challenge, proving the caller is the original requester.",
    "keyConceptsToCover": [
      "OAuth 2.0 PKCE",
      "code_verifier vs code_challenge",
      "Public Client Security",
      "Authorization Code Flow",
      "SHA-256"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-debugging-ipsi9",
    "role": "Cybersecurity & Systems Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "You detect unusual egress DNS traffic containing high volumes of subdomains (e.g., `a8f9b2c.data.attacker.com`). How do you investigate and stop this DNS Tunneling attack?",
    "hint": "DNS exfiltration, high entropy subdomains, analyzing DNS query logs, TXT record queries, egress firewall filtering.",
    "idealAnswer": "This pattern indicates DNS Tunneling or data exfiltration, where malware encodes stolen data into subdomain labels to bypass standard HTTP firewalls. 1) Investigation: Calculate Shannon Entropy on queried hostnames in Zeek or DNS query logs; tunneling displays unnaturally high character entropy and long label lengths. Check query types (TXT or NULL records often carry exfiltrated payloads). 2) Immediate Mitigation: Block the parent domain (`attacker.com`) on recursive DNS resolvers (e.g. Pi-hole / Umbrella). 3) Permanent Defense: Enforce DNS sinkholing, restrict outbound UDP 53 to authorized internal corporate resolvers only, and deploy DNS inspection with machine learning anomaly detection.",
    "keyConceptsToCover": [
      "DNS Tunneling",
      "Data Exfiltration",
      "Shannon Entropy",
      "DNS Sinkholing",
      "Zeek / Network Forensics"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-system-design-k56ig",
    "role": "Cybersecurity & Systems Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an automated Secrets Management and Key Rotation architecture for microservices using HashiCorp Vault or AWS Secrets Manager.",
    "hint": "Dynamic short-lived credentials, automatic rotation, envelope encryption, IAM auth, audit trails.",
    "idealAnswer": "1) Workloads authenticate to Vault using Kubernetes Service Account tokens or AWS IAM roles. 2) Dynamic Secrets: Rather than storing static long-lived DB passwords, Vault generates ephemeral database credentials with a 1-hour TTL on demand, automatically revoking them upon expiry. 3) Envelope Encryption: Sensitive data is encrypted with a Data Encryption Key (DEK) wrapped by a Master Key (KEK) managed in KMS/HSM. 4) Automated Rotation: Lambda functions rotate API keys and master keys on a 30-day schedule without application restarts, writing immutable audit trails for every secret access.",
    "keyConceptsToCover": [
      "HashiCorp Vault",
      "Dynamic Secrets",
      "Envelope Encryption",
      "Automated Key Rotation",
      "Audit Logging"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-core-technical-3c5s2",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain how Cross-Site Request Forgery (CSRF) and Cross-Site Scripting (XSS) differ, and how modern defenses (SameSite cookies, CSP) mitigate them.",
    "hint": "XSS executes arbitrary JS in victim context; CSRF tricks victim browser into executing unwanted actions in authenticated session. Content-Security-Policy, SameSite=Strict/Lax.",
    "idealAnswer": "XSS executes malicious JavaScript inside the victim's browser session, allowing attackers to steal local storage tokens or manipulate DOM. Mitigated by strict Content-Security-Policy (CSP) headers, escaping output, and using HttpOnly cookies. CSRF exploits the browser's automatic sending of cookies with cross-origin requests, tricking an authenticated user into submitting unwanted actions. Mitigated by SameSite=Lax/Strict cookie attributes, Anti-CSRF Synchronizer Tokens, and checking Origin/Referer headers.",
    "keyConceptsToCover": [
      "XSS vs CSRF",
      "Content-Security-Policy (CSP)",
      "SameSite Cookies",
      "HttpOnly / Secure",
      "Anti-CSRF Tokens"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-dsa-y4tdo",
    "role": "Cybersecurity & Systems Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "How does the Diffie-Hellman Key Exchange algorithm allow two parties to establish a shared cryptographic secret over an unsecure public channel?",
    "hint": "Modular arithmetic, public parameters (prime p, generator g), discrete logarithm problem.",
    "idealAnswer": "Alice and Bob agree on public parameters: a large prime p and generator g. Alice chooses private key a and sends A = g^a mod p. Bob chooses private key b and sends B = g^b mod p. Alice computes secret s = B^a mod p = (g^b)^a mod p. Bob computes secret s = A^b mod p = (g^a)^b mod p. Both compute the identical secret s = g^(ab) mod p. An eavesdropper Eve sees p, g, A, and B, but computing s requires solving the computationally intractable Discrete Logarithm problem.",
    "keyConceptsToCover": [
      "Diffie-Hellman",
      "Discrete Logarithm Problem",
      "Modular Arithmetic",
      "Public Key Cryptography",
      "Shared Secret"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-debugging-nhd9j",
    "role": "Cybersecurity & Systems Engineer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A security scanner reports that your web application is vulnerable to SQL Injection in a search endpoint. How do you reproduce, verify, and remediate it?",
    "hint": "Tainted input concatenation vs parameterized queries / prepared statements, ORM safety.",
    "idealAnswer": "1) Reproduce: Test with single quote payloads like `test' OR '1'='1` or sleep-based blind SQLi `test'; WAITFOR DELAY '0:0:5'--`. Check for database syntax errors or abnormal latency delays. 2) Root Cause: Inspect source code to locate string interpolation or raw SQL concatenation (`SELECT * FROM items WHERE name = '\" + input + \"'`). 3) Remediation: Replace all dynamic concatenation with Parameterized Queries (Prepared Statements) or use a modern ORM (Prisma/TypeORM) where input parameters are strictly treated as data literals rather than executable SQL syntax.",
    "keyConceptsToCover": [
      "SQL Injection (SQLi)",
      "Parameterized Queries",
      "Prepared Statements",
      "Input Sanitization",
      "Blind SQLi"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-behavioral-f9orx",
    "role": "Cybersecurity & Systems Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Describe a time when you discovered a critical zero-day vulnerability or security flaw right before a major product launch. What did you do?",
    "hint": "Risk-based triage, responsible disclosure, executive communication, providing an immediate mitigation path.",
    "idealAnswer": "Hours before launching a customer portal, I discovered an IDOR (Insecure Direct Object Reference) vulnerability in the user profile endpoint allowing any authenticated user to view other customers' invoices by modifying the document ID in the URL. I immediately informed the VP of Engineering and Product Lead with a clear PoC, quantified the regulatory and breach risk, and provided a 15-line middleware authorization patch that checked document ownership against the JWT session claims, enabling us to patch and deploy within 45 minutes without delaying the press announcement.",
    "keyConceptsToCover": [
      "IDOR Vulnerability",
      "Risk Assessment",
      "Responsible Escalation",
      "JWT Authorization",
      "Mitigation Speed"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-culture-7t50j",
    "role": "Cybersecurity & Systems Engineer",
    "category": "culture",
    "difficulty": "easy",
    "question": "How do you handle a situation where a software engineer intentionally bypasses security guidelines or CI linters to meet a tight deadline?",
    "hint": "Constructive empathy, understanding underlying pressure, explaining the blast radius, partnering on a clean solution.",
    "idealAnswer": "I approach the engineer with empathy first rather than punitive blame, recognizing that aggressive deadlines often drive shortcuts. I sit down with them to understand the blocker and explain the real-world blast radius (e.g. data breach, credential compromise). I then help them implement the secure path quickly using reusable libraries or automated templates, while ensuring security guardrails are non-bypassable in CI pipelines.",
    "keyConceptsToCover": [
      "Constructive Security Culture",
      "Blameless Empathy",
      "Secure By Default",
      "CI Guardrails"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-core-technical-lcqru",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "What is an SSRF (Server-Side Request Forgery) vulnerability, how is it exploited in cloud environments (AWS IMDSv1 vs IMDSv2), and how is it prevented?",
    "hint": "Querying internal metadata endpoint 169.254.169.254, IAM role credential theft, IMDSv2 session token header, egress network filtering.",
    "idealAnswer": "SSRF occurs when a backend server fetches a remote URL provided by a user without proper validation, allowing the attacker to coerce the server into sending requests to internal services. In AWS, attackers target the Instance Metadata Service (IMDS at 169.254.169.254) to steal EC2 IAM role credentials. AWS IMDSv2 prevents this by requiring a session-oriented PUT request with the `X-aws-ec2-metadata-token-ttl-seconds` header, which simple SSRF (GET/POST) cannot forge. Additional defenses include DNS resolution validation, blocking private IP ranges (RFC 1918), and egress firewalls.",
    "keyConceptsToCover": [
      "SSRF",
      "AWS IMDSv1 vs IMDSv2",
      "Instance Metadata",
      "RFC 1918 Private IPs",
      "Egress Filtering"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-system-design-otctn",
    "role": "Cybersecurity & Systems Engineer",
    "category": "system-design",
    "difficulty": "medium",
    "question": "How do you design a secure SIEM (Security Information and Event Management) logging pipeline that is tamper-proof and GDPR/HIPAA compliant?",
    "hint": "WORM storage (Write Once Read Many), PII masking / pseudonymization, cryptographic log hashing, SIEM ingestion (Elastic/Splunk).",
    "idealAnswer": "1) Ingestion: Log forwarders (Fluentbit) scrub or pseudonymize PII (SSNs, credit cards, passwords) at the edge before transmission. 2) Integrity: Each log batch is cryptographically signed and hashed into an append-only Merkle tree so tampering or deletion is instantly detectable. 3) Storage: Logs are forwarded to S3 Object Lock in Compliance mode (WORM storage) where even root AWS accounts cannot alter or delete logs before retention expiration. 4) Access: Enforce role-based read-only access and log all queries in CloudTrail.",
    "keyConceptsToCover": [
      "SIEM Pipeline",
      "WORM Storage",
      "PII Redaction",
      "Merkle Tree Integrity",
      "HIPAA/GDPR Compliance"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-debugging-ve7j9",
    "role": "Cybersecurity & Systems Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A production Linux server exhibits 100% CPU usage across all cores, but `top` and `ps` show normal user processes. How do you find the hidden rootkit/cryptominer?",
    "hint": "LD_PRELOAD hijacking, hidden PIDs, checking /proc/[0-9]*, eBPF, unlinking running binaries, network connections with ss/lsof.",
    "idealAnswer": "The rootkit has likely hijacked `/etc/ld.so.preload` or hooked system calls (getdents) to hide its process from `ps` and `top`. 1) Check `/etc/ld.so.preload` and verify system binary hashes (`rpm -V` or `debsums`). 2) Directly scan `/proc` directory by comparing brute-force integer directories against standard tool outputs. 3) Use un-hooked eBPF tracing tools or boot into a clean live rescue image. 4) Inspect raw network sockets with `ss -tulpn` or monitor packet traffic at the hypervisor level to identify remote mining pool IP connections.",
    "keyConceptsToCover": [
      "Linux Rootkit",
      "LD_PRELOAD Hijack",
      "Hidden Processes",
      "/proc Inspection",
      "eBPF Tracing"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-dsa-xcbnn",
    "role": "Cybersecurity & Systems Engineer",
    "category": "dsa",
    "difficulty": "hard",
    "question": "Explain how Cryptographic Hash Functions maintain Collision Resistance and Preimage Resistance, and why MD5 and SHA-1 are cryptographically broken.",
    "hint": "Avalanche effect, birthday paradox (O(2^(n/2)) collision search), length extension attacks.",
    "idealAnswer": "A cryptographic hash function requires: 1) Preimage Resistance: computationally infeasible to find message m given hash h = H(m). 2) Second Preimage Resistance: infeasible to find m2 != m1 such that H(m1) = H(m2). 3) Collision Resistance: infeasible to find ANY two messages with identical hashes. Due to the Birthday Paradox, finding collisions takes O(2^(n/2)) operations. MD5 (128-bit) and SHA-1 (160-bit) suffered differential cryptanalysis weaknesses reducing practical collision complexity to seconds, allowing attackers to forge certificates with matching hashes.",
    "keyConceptsToCover": [
      "Collision Resistance",
      "Preimage Resistance",
      "Birthday Paradox",
      "Differential Cryptanalysis",
      "SHA-256 vs SHA-1"
    ]
  }
,
  {
    "id": "full-stack-sde-system-design-baop5",
    "role": "Full-Stack SDE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a scalable notification service that delivers push notifications, SMS, and emails with prioritization and rate limiting.",
    "hint": "Discuss message broker partitioning (Kafka/RabbitMQ), worker pools, dead-letter queues, and tenant rate limiting with Redis.",
    "sampleAnswer": "I would architect the service with an API gateway feeding an Apache Kafka ingestion pipeline partitioned by user_id to ensure FIFO delivery per recipient. Notification workers pull from prioritized queues (Critical alerts > Transactional OTP > Marketing). Redis token buckets enforce carrier rate limits. Delivery state transitions (Queued, Sent, Delivered, Bounced) are streamed via WebSockets to users and persisted in PostgreSQL.",
    "idealAnswer": "I would architect the service with an API gateway feeding an Apache Kafka ingestion pipeline partitioned by user_id to ensure FIFO delivery per recipient. Notification workers pull from prioritized queues (Critical alerts > Transactional OTP > Marketing). Redis token buckets enforce carrier rate limits. Delivery state transitions (Queued, Sent, Delivered, Bounced) are streamed via WebSockets to users and persisted in PostgreSQL.",
    "keyConceptsToCover": [
      "Kafka Partitioning",
      "Priority Queues",
      "Redis Rate Limiting",
      "Dead Letter Queues",
      "Idempotent Delivery"
    ],
    "followUps": [
      "How do you prevent duplicate push notifications if a worker crashes before committing offset?",
      "How do you handle downstream third-party provider outages (e.g. Twilio)?"
    ]
  },
  {
    "id": "full-stack-sde-core-technical-f3ux4",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does Server-Sent Events (SSE) compare with WebSockets and Long Polling for real-time dashboard updates?",
    "hint": "Consider protocol overhead, unidirectional vs bidirectional needs, HTTP/2 multiplexing, and automatic browser reconnection.",
    "sampleAnswer": "SSE is a lightweight, unidirectional text stream operating over standard HTTP with native browser reconnection and HTTP/2 multiplexing support, making it ideal for live dashboards, logs, and AI token streaming. WebSockets provide full-duplex binary communication over a persistent TCP socket, which is necessary for low-latency two-way interactions like games or collaborative editors, but requires custom heartbeat and connection management.",
    "idealAnswer": "SSE is a lightweight, unidirectional text stream operating over standard HTTP with native browser reconnection and HTTP/2 multiplexing support, making it ideal for live dashboards, logs, and AI token streaming. WebSockets provide full-duplex binary communication over a persistent TCP socket, which is necessary for low-latency two-way interactions like games or collaborative editors, but requires custom heartbeat and connection management.",
    "keyConceptsToCover": [
      "SSE vs WebSockets",
      "HTTP/2 Multiplexing",
      "Unidirectional Streaming",
      "Connection Keep-Alive"
    ],
    "followUps": [
      "Why does HTTP/1.1 limit SSE to 6 concurrent connections per domain?",
      "How do you scale WebSocket servers across multiple load-balanced instances?"
    ]
  },
  {
    "id": "full-stack-sde-debugging-1x2u0",
    "role": "Full-Stack SDE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A client-side bundle size increased from 180KB to 1.8MB after a release, causing Core Web Vitals (LCP) to plummet. How do you triage and fix it?",
    "hint": "Use @next/bundle-analyzer or webpack-bundle-analyzer to find rogue imports, tree-shaking failures (e.g. lodash, lucide-react, moment), and route code-splitting.",
    "sampleAnswer": "I run @next/bundle-analyzer to generate an interactive treemap of chunk dependencies. Common culprits are barrel file re-exports preventing tree shaking, heavy un-optimized libraries (like importing entire lodash or moment instead of date-fns/es), or importing server utilities on the client. I enforce dynamic imports (React.lazy / next/dynamic) for heavy subcomponents (like Monaco editor or chart.js), alias heavy libraries to lightweight alternatives, and add bundle size CI limits.",
    "idealAnswer": "I run @next/bundle-analyzer to generate an interactive treemap of chunk dependencies. Common culprits are barrel file re-exports preventing tree shaking, heavy un-optimized libraries (like importing entire lodash or moment instead of date-fns/es), or importing server utilities on the client. I enforce dynamic imports (React.lazy / next/dynamic) for heavy subcomponents (like Monaco editor or chart.js), alias heavy libraries to lightweight alternatives, and add bundle size CI limits.",
    "keyConceptsToCover": [
      "Bundle Analyzer",
      "Tree Shaking",
      "Dynamic Imports",
      "LCP Optimization",
      "Barrel File Optimization"
    ],
    "followUps": [
      "How do barrel files (index.ts) defeat modern bundler tree-shaking algorithms?",
      "How does React Suspense work with dynamic imports to avoid layout shift?"
    ]
  },
  {
    "id": "full-stack-sde-dsa-yh79m",
    "role": "Full-Stack SDE",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an autocomplete search trie with top-k search frequency suggestions in sub-10ms.",
    "hint": "Trie node containing children pointers and a bounded Max-Heap / Top-K list at each prefix node for O(1) query lookup.",
    "sampleAnswer": "I implement a Trie where each node stores a hash map of child characters and a precomputed Top-K list of the most frequent complete words passing through that prefix. During ingestion/updating, we update the frequency map and maintain the top-k list using a min-heap of size K. When the user queries prefix P, we traverse down the trie in O(|P|) time and return the cached top-K array in O(1) without DFS traversal.",
    "idealAnswer": "I implement a Trie where each node stores a hash map of child characters and a precomputed Top-K list of the most frequent complete words passing through that prefix. During ingestion/updating, we update the frequency map and maintain the top-k list using a min-heap of size K. When the user queries prefix P, we traverse down the trie in O(|P|) time and return the cached top-K array in O(1) without DFS traversal.",
    "keyConceptsToCover": [
      "Prefix Trie",
      "Precomputed Top-K",
      "Min-Heap Maintenance",
      "O(L) Query Latency"
    ],
    "followUps": [
      "What is the memory trade-off of caching top-K suggestions at every trie node?",
      "How do you handle real-time search frequency decay for trending terms?"
    ]
  },
  {
    "id": "full-stack-sde-behavioral-2nr0y",
    "role": "Full-Stack SDE",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you had to deliver a high-stakes MVP under an impossible deadline with ambiguous requirements.",
    "hint": "STAR format: ruthlessly scoped non-critical features, established continuous user feedback loops, and prioritized zero-regression core user flows.",
    "sampleAnswer": "During our team's hackathon product launch, we had 72 hours to build a multi-tenant applicant tracker. Requirements were broad and constantly shifting. I led the technical scoping by defining the critical user journey (resume upload -> instant parsing -> interview invite) and pushed non-essential settings and custom themes to v2. We deployed automated end-to-end tests for the core funnel, launched on schedule, and onboarded 400 candidates with zero production downtime.",
    "idealAnswer": "During our team's hackathon product launch, we had 72 hours to build a multi-tenant applicant tracker. Requirements were broad and constantly shifting. I led the technical scoping by defining the critical user journey (resume upload -> instant parsing -> interview invite) and pushed non-essential settings and custom themes to v2. We deployed automated end-to-end tests for the core funnel, launched on schedule, and onboarded 400 candidates with zero production downtime.",
    "keyConceptsToCover": [
      "Ruthless Scoping",
      "MVP Delivery",
      "Risk Management",
      "Iterative Feedback"
    ],
    "followUps": [
      "How did you push back against stakeholders requesting last-minute feature additions?",
      "What technical debt did you incur to meet the deadline, and how did you pay it down?"
    ]
  },
  {
    "id": "full-stack-sde-culture-ifghv",
    "role": "Full-Stack SDE",
    "category": "culture",
    "difficulty": "medium",
    "question": "How do you establish engineering standards and conduct constructive code reviews without blocking team velocity?",
    "hint": "Automate linting/formatting via CI, focus code reviews on architecture, edge cases, and maintainability, and differentiate blockers from nits.",
    "sampleAnswer": "I believe tooling should enforce syntax and style automatically through Prettier, ESLint, and Husky pre-commit hooks, freeing reviewers to focus on architectural soundness, security vulnerabilities, edge-case resilience, and test coverage. During reviews, I categorize comments into 'Blocking' (bugs/security), 'Consider' (performance/design), and 'Nit' (non-blocking style preferences), ensuring feedback is actionable and authors maintain autonomy.",
    "idealAnswer": "I believe tooling should enforce syntax and style automatically through Prettier, ESLint, and Husky pre-commit hooks, freeing reviewers to focus on architectural soundness, security vulnerabilities, edge-case resilience, and test coverage. During reviews, I categorize comments into 'Blocking' (bugs/security), 'Consider' (performance/design), and 'Nit' (non-blocking style preferences), ensuring feedback is actionable and authors maintain autonomy.",
    "keyConceptsToCover": [
      "Automated CI Linting",
      "Architectural Review",
      "Constructive Feedback",
      "PR Velocity"
    ],
    "followUps": [
      "How do you resolve deadlocked code review opinions between senior engineers?",
      "What is an acceptable SLA for PR review turnaround time on an agile team?"
    ]
  },
  {
    "id": "full-stack-sde-custom-jd-2vo7n",
    "role": "Full-Stack SDE",
    "category": "custom-jd",
    "difficulty": "hard",
    "question": "Our platform handles multi-region active-active deployments. How do you handle distributed session management and database write conflicts?",
    "hint": "Compare sticky sessions vs shared Redis cluster with replication, CRDTs for conflicting writes, and CockroachDB/Spanner global consistency.",
    "sampleAnswer": "For multi-region deployments, I avoid sticky sessions by using stateless JWTs paired with an edge key-value cache (Cloudflare Workers KV or globally replicated Redis) for revocation checks. For database writes, I partition data by tenant region whenever possible to keep writes local. For cross-region transactional data, we use Spanner/CockroachDB with TrueTime consensus or event-sourcing with conflict-free replication (CRDTs) to reconcile out-of-order writes without catastrophic locking.",
    "idealAnswer": "For multi-region deployments, I avoid sticky sessions by using stateless JWTs paired with an edge key-value cache (Cloudflare Workers KV or globally replicated Redis) for revocation checks. For database writes, I partition data by tenant region whenever possible to keep writes local. For cross-region transactional data, we use Spanner/CockroachDB with TrueTime consensus or event-sourcing with conflict-free replication (CRDTs) to reconcile out-of-order writes without catastrophic locking.",
    "keyConceptsToCover": [
      "Active-Active Multi-Region",
      "Stateless Edge Sessions",
      "CRDT Write Reconciliation",
      "Global Consensus"
    ],
    "followUps": [
      "What is the difference between active-active and active-passive multi-region failover?",
      "How does network partition (CAP theorem) affect user sessions during trans-oceanic cable cuts?"
    ]
  },
  {
    "id": "full-stack-sde-core-technical-pcesq",
    "role": "Full-Stack SDE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "How do React 19 Actions and the `useActionState` hook simplify asynchronous form submissions compared to legacy `useEffect` state syncing?",
    "hint": "Discuss pending states, optimistic UI updates via useOptimistic, progressive enhancement, and automated error rollbacks.",
    "sampleAnswer": "React 19 Actions treat async transitions as first-class primitives. Instead of manually coordinating `isLoading`, `error`, and `data` state through `useEffect`, `useActionState` accepts an async server or client action and automatically manages pending transitions. Combined with `useOptimistic`, the UI can immediately render the anticipated state while the background network mutation completes, automatically reverting if the action rejects without complex rollback boilerplate.",
    "idealAnswer": "React 19 Actions treat async transitions as first-class primitives. Instead of manually coordinating `isLoading`, `error`, and `data` state through `useEffect`, `useActionState` accepts an async server or client action and automatically manages pending transitions. Combined with `useOptimistic`, the UI can immediately render the anticipated state while the background network mutation completes, automatically reverting if the action rejects without complex rollback boilerplate.",
    "keyConceptsToCover": [
      "React 19 Actions",
      "useActionState",
      "useOptimistic",
      "Progressive Enhancement"
    ],
    "followUps": [
      "How does progressive enhancement work when JavaScript is still loading in React 19?",
      "How do Server Actions maintain CSRF protection in Next.js?"
    ]
  },
  {
    "id": "frontend-developer-core-technical-14q02",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how the browser rendering pipeline works (DOM, CSSOM, Render Tree, Layout, Paint, Composite) and how to avoid forced synchronous layout (layout thrashing).",
    "hint": "Discuss reading geometry properties (offsetWidth, scrollHeight) immediately after mutating the DOM, requestAnimationFrame, and will-change CSS.",
    "sampleAnswer": "The browser parses HTML to construct the DOM and CSS to construct the CSSOM, combining them into the Render Tree. It then calculates geometric dimensions (Layout/Reflow), converts vector graphics into pixels (Paint), and composites layers onto the GPU. Forced synchronous layout occurs when JavaScript reads geometry properties (e.g. element.offsetHeight) immediately after modifying styles, forcing the browser to recalculate layout prematurely in the middle of a frame. To prevent this, batch all DOM reads before writes or use requestAnimationFrame.",
    "idealAnswer": "The browser parses HTML to construct the DOM and CSS to construct the CSSOM, combining them into the Render Tree. It then calculates geometric dimensions (Layout/Reflow), converts vector graphics into pixels (Paint), and composites layers onto the GPU. Forced synchronous layout occurs when JavaScript reads geometry properties (e.g. element.offsetHeight) immediately after modifying styles, forcing the browser to recalculate layout prematurely in the middle of a frame. To prevent this, batch all DOM reads before writes or use requestAnimationFrame.",
    "keyConceptsToCover": [
      "Browser Render Pipeline",
      "Render Tree",
      "Layout Thrashing",
      "GPU Compositing",
      "requestAnimationFrame"
    ],
    "followUps": [
      "Why does animating `transform` and `opacity` bypass the Paint and Layout phases?",
      "What is the performance cost of overusing `will-change: transform`?"
    ]
  },
  {
    "id": "frontend-developer-system-design-efqta",
    "role": "Frontend Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a high-performance virtualized list (like react-window) that renders 100,000 items with variable heights at 60 FPS.",
    "hint": "Calculate viewport window, binary search for dynamic offset calculation, absolute positioning, and DOM recycling.",
    "sampleAnswer": "A virtual list only mounts elements currently visible in the scroll viewport plus a small buffer of overscan items. For variable heights, we maintain an item height cache and prefix sum array of cumulative heights. Using binary search on the prefix sums, we determine the start and end indices in O(log n) time based on scrollTop. Visible items are positioned absolutely inside an outer container whose height matches total list height. When items render, ResizeObserver measures true heights and updates the prefix sums.",
    "idealAnswer": "A virtual list only mounts elements currently visible in the scroll viewport plus a small buffer of overscan items. For variable heights, we maintain an item height cache and prefix sum array of cumulative heights. Using binary search on the prefix sums, we determine the start and end indices in O(log n) time based on scrollTop. Visible items are positioned absolutely inside an outer container whose height matches total list height. When items render, ResizeObserver measures true heights and updates the prefix sums.",
    "keyConceptsToCover": [
      "Virtualization",
      "Prefix Sum Binary Search",
      "ResizeObserver",
      "DOM Recycling",
      "60 FPS Scrolling"
    ],
    "followUps": [
      "How do you prevent scroll jumping when items above the current viewport dynamically change height?",
      "How does overscan prevent blank white gaps during rapid flick-scrolling?"
    ]
  },
  {
    "id": "frontend-developer-debugging-04rb8",
    "role": "Frontend Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A React application experiences sluggish typing input in a large search form. How do you identify whether the bottleneck is re-renders or JS execution, and fix it?",
    "hint": "Use React Profiler to inspect 'Why did this render?', useDeferredValue vs useTransition, and memoization of subtrees.",
    "sampleAnswer": "I open React DevTools Profiler and record a typing interaction. If many sibling components highlight yellow/red with 'Parent rendered', unnecessary re-renders are the culprit. I isolate the input state locally, wrap heavy filtered child components in React.memo with stable callbacks (useCallback). If filtering the 10,000-item array is computationally expensive, I use `useDeferredValue` to keep typing high-priority while deferring the search results list, or delegate sorting to a Web Worker.",
    "idealAnswer": "I open React DevTools Profiler and record a typing interaction. If many sibling components highlight yellow/red with 'Parent rendered', unnecessary re-renders are the culprit. I isolate the input state locally, wrap heavy filtered child components in React.memo with stable callbacks (useCallback). If filtering the 10,000-item array is computationally expensive, I use `useDeferredValue` to keep typing high-priority while deferring the search results list, or delegate sorting to a Web Worker.",
    "keyConceptsToCover": [
      "React Profiler",
      "useDeferredValue",
      "useTransition",
      "React.memo",
      "Web Workers"
    ],
    "followUps": [
      "What is the fundamental difference between debouncing and useDeferredValue?",
      "When does using useMemo actually degrade performance instead of improving it?"
    ]
  },
  {
    "id": "frontend-developer-dsa-3acuh",
    "role": "Frontend Developer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an event emitter (pub-sub) in TypeScript with subscribe, unsubscribe, emit, and once methods.",
    "hint": "Hash map of event names to arrays of callback functions with unique subscription tokens or splice removal.",
    "sampleAnswer": "I maintain a `Map<string, Set<Function>>` for constant-time subscriber management. The `subscribe(event, cb)` method returns an unsubscribe cleanup function. The `emit(event, ...args)` iterates through the Set and executes all listeners safely. The `once(event, cb)` wraps the callback in a self-deregistering function that calls `unsubscribe()` before executing `cb()`, ensuring exact one-time invocation.",
    "idealAnswer": "I maintain a `Map<string, Set<Function>>` for constant-time subscriber management. The `subscribe(event, cb)` method returns an unsubscribe cleanup function. The `emit(event, ...args)` iterates through the Set and executes all listeners safely. The `once(event, cb)` wraps the callback in a self-deregistering function that calls `unsubscribe()` before executing `cb()`, ensuring exact one-time invocation.",
    "keyConceptsToCover": [
      "Pub-Sub Pattern",
      "Event Emitter",
      "Set-based Storage",
      "Once Wrapper"
    ],
    "followUps": [
      "How do you catch unhandled exceptions inside one subscriber without preventing subsequent subscribers from running?",
      "How do you detect memory leaks from forgotten subscriptions in single-page apps?"
    ]
  },
  {
    "id": "frontend-developer-behavioral-ke17v",
    "role": "Frontend Developer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Describe a project where you had to collaborate closely with product design (UI/UX) to implement a complex, highly interactive design with tight technical constraints.",
    "hint": "STAR format: proactive component architecture, bridging design tokens with Tailwind/CSS variables, and negotiating progressive enhancement for mobile.",
    "sampleAnswer": "When building a data visualization workspace, design proposed interactive canvas nodes with complex bezier connectors. On mobile, touch drag created severe stuttering. I scheduled a working session with our designer, demonstrated the frame-rate profiling data, and proposed an adapted mobile card view with swipeable drawer inspectors. The designer approved the compromise, and our mobile conversion rose 24% due to responsive fluidity.",
    "idealAnswer": "When building a data visualization workspace, design proposed interactive canvas nodes with complex bezier connectors. On mobile, touch drag created severe stuttering. I scheduled a working session with our designer, demonstrated the frame-rate profiling data, and proposed an adapted mobile card view with swipeable drawer inspectors. The designer approved the compromise, and our mobile conversion rose 24% due to responsive fluidity.",
    "keyConceptsToCover": [
      "Design Systems",
      "Progressive Enhancement",
      "Frame-Rate Profiling",
      "Cross-Functional Collaboration"
    ],
    "followUps": [
      "How do you maintain a single source of truth for design tokens between Figma and code?",
      "What accessibility (WCAG) checks do you run before approving custom UI components?"
    ]
  },
  {
    "id": "frontend-developer-culture-lcruc",
    "role": "Frontend Developer",
    "category": "culture",
    "difficulty": "medium",
    "question": "What is your approach to Web Accessibility (a11y) and ensuring compliance with WCAG 2.1 AA standards?",
    "hint": "Semantic HTML first, proper ARIA roles and labels, keyboard focus management, color contrast ratios, and automated axe-core testing.",
    "sampleAnswer": "Accessibility starts with semantic HTML elements (button, nav, main, dialog) which have built-in keyboard navigation and screen-reader semantics. For custom complex widgets (like comboboxes or tabs), I implement WAI-ARIA authoring practices, managing aria-expanded, aria-selected, and keyboard arrow navigation. I integrate axe-core into our CI pipeline to catch missing alt texts and contrast issues, and manually test tab indices and screen reader announcements (VoiceOver/NVDA).",
    "idealAnswer": "Accessibility starts with semantic HTML elements (button, nav, main, dialog) which have built-in keyboard navigation and screen-reader semantics. For custom complex widgets (like comboboxes or tabs), I implement WAI-ARIA authoring practices, managing aria-expanded, aria-selected, and keyboard arrow navigation. I integrate axe-core into our CI pipeline to catch missing alt texts and contrast issues, and manually test tab indices and screen reader announcements (VoiceOver/NVDA).",
    "keyConceptsToCover": [
      "WCAG 2.1 AA",
      "Semantic HTML",
      "WAI-ARIA Patterns",
      "Keyboard Focus Trap",
      "axe-core"
    ],
    "followUps": [
      "How do you trap keyboard focus inside a modal dialog and restore it upon closing?",
      "What is the difference between `aria-hidden='true'` and CSS `display: none` for assistive tech?"
    ]
  },
  {
    "id": "frontend-developer-custom-jd-66wzo",
    "role": "Frontend Developer",
    "category": "custom-jd",
    "difficulty": "hard",
    "question": "How do you implement micro-frontend architecture using Webpack Module Federation or Vite, and how do you handle shared dependencies and style isolation?",
    "hint": "Module Federation host/remote containers, shared singletons (React, ReactDOM), CSS modules / Shadow DOM for styling encapsulation.",
    "sampleAnswer": "Module Federation exposes remotes that a host shell loads dynamically at runtime. In the Webpack configuration, we mark core shared libraries (React, React-DOM, UI theme) as singletons with strict version matching to prevent multiple React instances in memory. For style isolation, we use CSS Modules or Tailwind scoped prefixing, or Shadow DOM encapsulation for third-party embeds to prevent CSS leaking across micro-apps.",
    "idealAnswer": "Module Federation exposes remotes that a host shell loads dynamically at runtime. In the Webpack configuration, we mark core shared libraries (React, React-DOM, UI theme) as singletons with strict version matching to prevent multiple React instances in memory. For style isolation, we use CSS Modules or Tailwind scoped prefixing, or Shadow DOM encapsulation for third-party embeds to prevent CSS leaking across micro-apps.",
    "keyConceptsToCover": [
      "Module Federation",
      "Micro-Frontends",
      "Shared Singletons",
      "Style Encapsulation",
      "Runtime Remotes"
    ],
    "followUps": [
      "How do you handle a micro-frontend remote failing to load gracefully in the host shell?",
      "How does cross-micro-frontend routing and authentication token sharing work?"
    ]
  },
  {
    "id": "frontend-developer-core-technical-6f07d",
    "role": "Frontend Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How do modern CSS container queries differ from media queries, and how do they enable truly modular component design systems?",
    "hint": "Container queries evaluate styles based on the parent container's dimensions rather than viewport width, enabling reusable cards in sidebars vs main content.",
    "sampleAnswer": "Media queries look at the global viewport width, which breaks component modularity when the same card component is placed inside a narrow sidebar or a wide main content grid. Container queries (`container-type: inline-size`) allow a component to inspect its immediate parent container's width. This allows a single card component to automatically switch from a vertical stack to a horizontal layout based strictly on its allocated space.",
    "idealAnswer": "Media queries look at the global viewport width, which breaks component modularity when the same card component is placed inside a narrow sidebar or a wide main content grid. Container queries (`container-type: inline-size`) allow a component to inspect its immediate parent container's width. This allows a single card component to automatically switch from a vertical stack to a horizontal layout based strictly on its allocated space.",
    "keyConceptsToCover": [
      "CSS Container Queries",
      "inline-size",
      "Component Modularity",
      "Media Queries vs Container Queries"
    ],
    "followUps": [
      "What is container query naming (`container-name`), and when is it required?",
      "How do container queries affect browser layout performance compared to standard classes?"
    ]
  },
  {
    "id": "backend-engineer-system-design-tidmg",
    "role": "Backend Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an idempotent payment processing system that interfaces with Stripe/Razorpay and guarantees zero double-charging under network retries.",
    "hint": "Discuss client-generated idempotency keys, atomic database locks, two-phase commit or transactional outbox, and webhook reconciliation.",
    "sampleAnswer": "I generate a client UUID idempotency key for every checkout attempt. When the request hits the payment gateway API, we open a database transaction and attempt to insert the idempotency key into a payments_requests table with a UNIQUE constraint. If already present, we return the cached previous response. If new, we mark status PENDING, invoke Stripe with the idempotency key, record the external transaction ID, and update status to COMPLETED within an atomic transaction. A webhook consumer reconciles dropped socket connections.",
    "idealAnswer": "I generate a client UUID idempotency key for every checkout attempt. When the request hits the payment gateway API, we open a database transaction and attempt to insert the idempotency key into a payments_requests table with a UNIQUE constraint. If already present, we return the cached previous response. If new, we mark status PENDING, invoke Stripe with the idempotency key, record the external transaction ID, and update status to COMPLETED within an atomic transaction. A webhook consumer reconciles dropped socket connections.",
    "keyConceptsToCover": [
      "Idempotency Keys",
      "Unique Constraint Locking",
      "Transactional Outbox",
      "Webhook Reconciliation",
      "At-Most-Once Execution"
    ],
    "followUps": [
      "How do you handle the race condition where a duplicate request arrives while the first request is still awaiting third-party HTTP response?",
      "How do you expire old idempotency keys safely in PostgreSQL?"
    ]
  },
  {
    "id": "backend-engineer-core-technical-nho40",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain Database Isolation Levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) and the anomalies they prevent (Dirty Read, Non-repeatable Read, Phantom Read, Write Skew).",
    "hint": "Contrast MVCC implementation in PostgreSQL vs 2PL (Two-Phase Locking). Explain how write skew occurs in Repeatable Read and how SSI prevents it.",
    "sampleAnswer": "PostgreSQL implements MVCC (Multi-Version Concurrency Control). Read Committed takes a snapshot at the start of each query, preventing Dirty Reads. Repeatable Read takes a snapshot at the start of the transaction, preventing Non-Repeatable Reads and Phantom Reads. However, Repeatable Read is still vulnerable to Write Skew (where concurrent transactions read non-overlapping rows to enforce a cross-row constraint). Serializable uses Serializable Snapshot Isolation (SSI) to track rw-antidependencies and abort conflicting transactions with serialization failures (error 40001).",
    "idealAnswer": "PostgreSQL implements MVCC (Multi-Version Concurrency Control). Read Committed takes a snapshot at the start of each query, preventing Dirty Reads. Repeatable Read takes a snapshot at the start of the transaction, preventing Non-Repeatable Reads and Phantom Reads. However, Repeatable Read is still vulnerable to Write Skew (where concurrent transactions read non-overlapping rows to enforce a cross-row constraint). Serializable uses Serializable Snapshot Isolation (SSI) to track rw-antidependencies and abort conflicting transactions with serialization failures (error 40001).",
    "keyConceptsToCover": [
      "ACID Isolation Levels",
      "MVCC",
      "Write Skew",
      "Serializable Snapshot Isolation (SSI)",
      "Dirty Reads"
    ],
    "followUps": [
      "Why does PostgreSQL default to Read Committed instead of Serializable?",
      "How does an application gracefully handle serialization failure retries in production?"
    ]
  },
  {
    "id": "backend-engineer-dsa-b19yj",
    "role": "Backend Engineer",
    "category": "dsa",
    "difficulty": "hard",
    "question": "Design and implement a Distributed Rate Limiter with Leaky Bucket and Token Bucket algorithms supporting multi-datacenter consistency.",
    "hint": "Redis Lua script atomic decrement, token bucket replenishment formula, sliding log vs sliding window counter.",
    "sampleAnswer": "I implement the Token Bucket algorithm using Redis and a Lua script for atomic execution. The Redis hash stores `last_refill_timestamp` and `current_tokens`. On each request, the Lua script computes elapsed time since last refill, adds newly accrued tokens based on rate, clamps to bucket capacity, and checks if tokens >= 1. If so, it decrements tokens and returns 1; otherwise 0. Because the calculation is derived from timestamps inside the script, no background timer thread is required.",
    "idealAnswer": "I implement the Token Bucket algorithm using Redis and a Lua script for atomic execution. The Redis hash stores `last_refill_timestamp` and `current_tokens`. On each request, the Lua script computes elapsed time since last refill, adds newly accrued tokens based on rate, clamps to bucket capacity, and checks if tokens >= 1. If so, it decrements tokens and returns 1; otherwise 0. Because the calculation is derived from timestamps inside the script, no background timer thread is required.",
    "keyConceptsToCover": [
      "Token Bucket Algorithm",
      "Redis Atomic Lua Scripts",
      "Rate Limiter Capacity",
      "Burst Handling"
    ],
    "followUps": [
      "How do you synchronize rate limit counters across distinct geographic AWS regions without latency penalty?",
      "How does the Leaky Bucket algorithm smooth traffic differently than Token Bucket?"
    ]
  },
  {
    "id": "backend-engineer-debugging-cydyv",
    "role": "Backend Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "Your PostgreSQL database CPU hits 100% and queries begin queuing up with 'remaining connection slots reserved for non-replication superuser connections'. Walk through emergency mitigation.",
    "hint": "Identify rogue queries with pg_stat_activity, kill long-running queries with pg_terminate_backend, scale PgBouncer connection pool, and analyze EXPLAIN plans.",
    "sampleAnswer": "First, I run an emergency query on `pg_stat_activity` to find long-running transactions waiting on locks (`state = 'active'`). I identify unindexed runaway queries and terminate the top offending process IDs using `pg_terminate_backend(pid)`. To prevent connection flooding, I route traffic through PgBouncer in transaction pooling mode, which multiplexes thousands of application threads into a controlled pool of 50-100 real Postgres connections. Next, I inspect slow query logs with `EXPLAIN (ANALYZE, BUFFERS)` to add missing composite indexes.",
    "idealAnswer": "First, I run an emergency query on `pg_stat_activity` to find long-running transactions waiting on locks (`state = 'active'`). I identify unindexed runaway queries and terminate the top offending process IDs using `pg_terminate_backend(pid)`. To prevent connection flooding, I route traffic through PgBouncer in transaction pooling mode, which multiplexes thousands of application threads into a controlled pool of 50-100 real Postgres connections. Next, I inspect slow query logs with `EXPLAIN (ANALYZE, BUFFERS)` to add missing composite indexes.",
    "keyConceptsToCover": [
      "pg_stat_activity",
      "pg_terminate_backend",
      "PgBouncer Transaction Pooling",
      "EXPLAIN ANALYZE BUFFERS",
      "Connection Starvation"
    ],
    "followUps": [
      "What is the difference between `pg_cancel_backend` and `pg_terminate_backend`?",
      "Why does increasing max_connections in postgresql.conf often decrease overall database throughput?"
    ]
  },
  {
    "id": "backend-engineer-behavioral-nmidy",
    "role": "Backend Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a major production outage you caused or triaged. How did you handle communications and post-mortem root cause analysis (RCA)?",
    "hint": "Blameless post-mortem, immediate mitigation before root-cause analysis, clear stakeholder status page updates, and preventive systemic safeguards.",
    "sampleAnswer": "During a database migration, an unindexed foreign-key constraint locked an active orders table, causing API timeouts for 18 minutes. I immediately ordered a migration rollback to restore traffic, drafted an incident update on our internal status page, and led a blameless post-mortem. We identified that our staging database lacked production-scale row volume, which masked table locks. As a systemic fix, we added automated CI checks for `ADD CONSTRAINT ... NOT VALID` with concurrent validation and mandatory migration dry-runs.",
    "idealAnswer": "During a database migration, an unindexed foreign-key constraint locked an active orders table, causing API timeouts for 18 minutes. I immediately ordered a migration rollback to restore traffic, drafted an incident update on our internal status page, and led a blameless post-mortem. We identified that our staging database lacked production-scale row volume, which masked table locks. As a systemic fix, we added automated CI checks for `ADD CONSTRAINT ... NOT VALID` with concurrent validation and mandatory migration dry-runs.",
    "keyConceptsToCover": [
      "Blameless Post-Mortem",
      "Incident Commander",
      "Zero-Downtime Migrations",
      "Systemic Guardrails"
    ],
    "followUps": [
      "What metrics do you track during post-mortem reviews (MTTD, MTTR)?",
      "How do you communicate complex technical outages to non-technical executive stakeholders?"
    ]
  },
  {
    "id": "backend-engineer-culture-xx7ta",
    "role": "Backend Engineer",
    "category": "culture",
    "difficulty": "medium",
    "question": "How do you design RESTful and gRPC APIs for backwards compatibility without breaking existing mobile and third-party consumers?",
    "hint": "Semantic versioning, additive schema changes, protobuf tag stability, deprecation headers, and deprecation sunset cycles.",
    "sampleAnswer": "I follow strict additive-only schema evolution. In REST, we never delete or rename existing JSON fields or change data types; new fields are optional. When a fundamental contract change is necessary, we introduce versioned routes (/v2/) or accept version headers. In gRPC/Protobuf, field numbers must never be modified or reused (using the `reserved` keyword for deleted tags). We provide deprecation warnings using HTTP `Sunset` and `Deprecation` headers with 6-month consumer notification windows.",
    "idealAnswer": "I follow strict additive-only schema evolution. In REST, we never delete or rename existing JSON fields or change data types; new fields are optional. When a fundamental contract change is necessary, we introduce versioned routes (/v2/) or accept version headers. In gRPC/Protobuf, field numbers must never be modified or reused (using the `reserved` keyword for deleted tags). We provide deprecation warnings using HTTP `Sunset` and `Deprecation` headers with 6-month consumer notification windows.",
    "keyConceptsToCover": [
      "API Backward Compatibility",
      "Protobuf Reserved Tags",
      "Additive Schema Evolution",
      "Sunset Headers"
    ],
    "followUps": [
      "Why is Protobuf serialization faster and more compact than JSON over HTTP/2?",
      "How do you safely deprecate an API endpoint when third-party SDKs cannot be force-updated?"
    ]
  },
  {
    "id": "backend-engineer-custom-jd-v9fad",
    "role": "Backend Engineer",
    "category": "custom-jd",
    "difficulty": "hard",
    "question": "How would you architect a distributed caching layer with Redis Cluster, handling cache penetration, cache breakdown (thundering herd), and cache avalanche?",
    "hint": "Cache Penetration: Bloom Filters. Cache Breakdown: Mutex locking / single-flight. Cache Avalanche: Jittered TTLs.",
    "sampleAnswer": "To solve Cache Avalanche (where thousands of keys expire simultaneously), I add random jitter to all expiration TTLs (e.g. 1 hour +/- 10 minutes). For Cache Breakdown / Thundering Herd (a hot key expires and 10,000 concurrent requests hammer the DB), I use a distributed mutex lock (Redlock) or Go's singleflight pattern so only 1 request queries the DB while others wait. For Cache Penetration (queries for non-existent IDs), I place a Bloom Filter in front of the cache and cache null values with short TTLs.",
    "idealAnswer": "To solve Cache Avalanche (where thousands of keys expire simultaneously), I add random jitter to all expiration TTLs (e.g. 1 hour +/- 10 minutes). For Cache Breakdown / Thundering Herd (a hot key expires and 10,000 concurrent requests hammer the DB), I use a distributed mutex lock (Redlock) or Go's singleflight pattern so only 1 request queries the DB while others wait. For Cache Penetration (queries for non-existent IDs), I place a Bloom Filter in front of the cache and cache null values with short TTLs.",
    "keyConceptsToCover": [
      "Cache Avalanche (TTL Jitter)",
      "Thundering Herd (Mutex/Singleflight)",
      "Cache Penetration (Bloom Filters)",
      "Redis Cluster"
    ],
    "followUps": [
      "What are the trade-offs of Cache-Aside versus Write-Through and Write-Behind caching strategies?",
      "How does Redis handle memory eviction when maxmemory is reached (allkeys-lru vs volatile-lfu)?"
    ]
  },
  {
    "id": "backend-engineer-core-technical-xpsye",
    "role": "Backend Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "What is the difference between TCP and UDP, and why does HTTP/3 switch from TCP to UDP with the QUIC protocol?",
    "hint": "TCP head-of-line blocking, 3-way handshake latency, QUIC connection migration, independent stream multiplexing over UDP.",
    "sampleAnswer": "TCP provides reliable, ordered byte streams via acknowledgments and retransmissions, requiring a 3-way handshake (plus TLS handshake). In HTTP/2 over TCP, if a single packet is dropped, the entire connection stalls waiting for retransmission (Head-of-Line blocking). HTTP/3 replaces TCP with QUIC over UDP. QUIC moves stream multiplexing into the transport layer, so a dropped packet in Stream A never stalls Stream B. Additionally, QUIC supports 0-RTT handshakes and seamless connection migration across IP/Wi-Fi switches.",
    "idealAnswer": "TCP provides reliable, ordered byte streams via acknowledgments and retransmissions, requiring a 3-way handshake (plus TLS handshake). In HTTP/2 over TCP, if a single packet is dropped, the entire connection stalls waiting for retransmission (Head-of-Line blocking). HTTP/3 replaces TCP with QUIC over UDP. QUIC moves stream multiplexing into the transport layer, so a dropped packet in Stream A never stalls Stream B. Additionally, QUIC supports 0-RTT handshakes and seamless connection migration across IP/Wi-Fi switches.",
    "keyConceptsToCover": [
      "TCP vs UDP",
      "HTTP/3 & QUIC",
      "Head-of-Line Blocking",
      "0-RTT Handshakes",
      "Connection Migration"
    ],
    "followUps": [
      "How does QUIC achieve connection migration when a mobile phone switches from Wi-Fi to cellular data?",
      "What are the security implications of 0-RTT replay attacks in QUIC?"
    ]
  },
  {
    "id": "ml-data-engineer-system-design-6jcwu",
    "role": "ML/Data Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a real-time feature store and inference pipeline for a fraud detection system processing 10,000 transactions per second under 50ms SLA.",
    "hint": "Dual storage (Redis for low-latency online inference + S3/Parquet for offline training), Feast feature store, streaming Kafka + Flink.",
    "sampleAnswer": "I would architecture the pipeline around a feature store (like Feast). Real-time events stream into Apache Kafka, where Apache Flink computes rolling window aggregates (e.g. user transaction count in last 10 minutes) and pushes features to Redis for sub-5ms online key-value retrieval. During inference, the API fetches entity features from Redis, combines them with transaction metadata, and passes the vector to an ONNX runtime model container. Asynchronously, features are written to Delta Lake on S3 for batch model retraining.",
    "idealAnswer": "I would architecture the pipeline around a feature store (like Feast). Real-time events stream into Apache Kafka, where Apache Flink computes rolling window aggregates (e.g. user transaction count in last 10 minutes) and pushes features to Redis for sub-5ms online key-value retrieval. During inference, the API fetches entity features from Redis, combines them with transaction metadata, and passes the vector to an ONNX runtime model container. Asynchronously, features are written to Delta Lake on S3 for batch model retraining.",
    "keyConceptsToCover": [
      "Feature Store (Feast)",
      "Apache Flink Streaming",
      "Redis Online Inference",
      "ONNX Model Runtime",
      "Feature Drift"
    ],
    "followUps": [
      "How do you prevent train-serve skew between offline training data and online inference features?",
      "How do you handle feature store schema evolution when new ML features are deployed?"
    ]
  },
  {
    "id": "ml-data-engineer-core-technical-2drvj",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain the internal mechanisms of Self-Attention and Multi-Head Attention in Transformer models ($Q, K, V$ matrices and scaled dot-product).",
    "hint": "Derive Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V. Explain why scaling factor sqrt(d_k) prevents vanishing gradients in softmax.",
    "sampleAnswer": "Self-attention maps input embeddings into Queries (Q), Keys (K), and Values (V) via learned weight projections. We calculate similarity scores via dot product: QK^T. As dimension d_k grows large, dot products grow large in magnitude, pushing the softmax function into regions with near-zero gradients. Therefore, we scale by 1/sqrt(d_k). Multiplying softmax scores by V gives the weighted representation. Multi-Head Attention runs this across h independent subspaces, allowing the model to jointly attend to semantic, positional, and syntactic relationships.",
    "idealAnswer": "Self-attention maps input embeddings into Queries (Q), Keys (K), and Values (V) via learned weight projections. We calculate similarity scores via dot product: QK^T. As dimension d_k grows large, dot products grow large in magnitude, pushing the softmax function into regions with near-zero gradients. Therefore, we scale by 1/sqrt(d_k). Multiplying softmax scores by V gives the weighted representation. Multi-Head Attention runs this across h independent subspaces, allowing the model to jointly attend to semantic, positional, and syntactic relationships.",
    "keyConceptsToCover": [
      "Scaled Dot-Product Attention",
      "Query-Key-Value Projections",
      "Vanishing Gradients in Softmax",
      "Multi-Head Subspaces"
    ],
    "followUps": [
      "What is the computational complexity of standard self-attention relative to sequence length L, and how does FlashAttention optimize it?",
      "How do Rotary Position Embeddings (RoPE) encode relative token distances?"
    ]
  },
  {
    "id": "ml-data-engineer-debugging-6mr9t",
    "role": "ML/Data Engineer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Your model training loss decreases steadily, but validation loss diverges after epoch 4, and production accuracy is 20% lower than validation accuracy. Triage and fix.",
    "hint": "Overfitting, data leakage between train/test splits, covariate shift / concept drift, regularization (Dropout, L2, data augmentation).",
    "sampleAnswer": "When training loss drops while validation loss rises, the model is overfitting. I introduce regularization: dropout layers (0.2–0.5), L2 weight decay, and data augmentation. If production accuracy is further degraded below validation, data leakage or covariate shift has occurred. I verify that feature scalers (StandardScaler) were fitted strictly on the training fold, check for future target leakage in timestamped data, and compare input distributions using Kolmogorov-Smirnov statistical tests.",
    "idealAnswer": "When training loss drops while validation loss rises, the model is overfitting. I introduce regularization: dropout layers (0.2–0.5), L2 weight decay, and data augmentation. If production accuracy is further degraded below validation, data leakage or covariate shift has occurred. I verify that feature scalers (StandardScaler) were fitted strictly on the training fold, check for future target leakage in timestamped data, and compare input distributions using Kolmogorov-Smirnov statistical tests.",
    "keyConceptsToCover": [
      "Overfitting",
      "Data Leakage",
      "Covariate Shift",
      "Dropout & Weight Decay",
      "Distribution Drift"
    ],
    "followUps": [
      "What is the difference between Covariate Shift and Concept Drift?",
      "How do you detect feature drift in production without ground truth labels?"
    ]
  },
  {
    "id": "ml-data-engineer-dsa-ccg8c",
    "role": "ML/Data Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an approximate nearest neighbors (ANN) vector search index using Cosine Similarity and K-Means clustering.",
    "hint": "Inverted file index (IVF), vector quantization, dot product normalization, centroid distance ranking.",
    "sampleAnswer": "For Cosine Similarity, all embedding vectors are first normalized to unit length so dot product equals cosine similarity. To achieve sub-linear retrieval without brute-force O(N) scanning, I implement an Inverted File Index (IVF). During indexing, K-Means clusters vectors into C centroids. At query time, we find the top-P closest centroids to the query vector and only perform exact dot-product comparisons against vectors assigned to those Voronoi cells, reducing search complexity from O(N) to O(C + N/C).",
    "idealAnswer": "For Cosine Similarity, all embedding vectors are first normalized to unit length so dot product equals cosine similarity. To achieve sub-linear retrieval without brute-force O(N) scanning, I implement an Inverted File Index (IVF). During indexing, K-Means clusters vectors into C centroids. At query time, we find the top-P closest centroids to the query vector and only perform exact dot-product comparisons against vectors assigned to those Voronoi cells, reducing search complexity from O(N) to O(C + N/C).",
    "keyConceptsToCover": [
      "Vector Similarity Search",
      "Inverted File Index (IVF)",
      "Voronoi Cells",
      "Cosine Similarity Normalization"
    ],
    "followUps": [
      "How does Hierarchical Navigable Small World (HNSW) graphs outperform IVF in high-recall vector search?",
      "What is Scalar Quantization (SQ8) and how does it reduce vector database memory usage?"
    ]
  },
  {
    "id": "ml-data-engineer-behavioral-tqvbn",
    "role": "ML/Data Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you had to explain a complex ML model's predictions (or failure modes) to non-technical business stakeholders.",
    "hint": "STAR format: used SHAP / LIME feature importance values, created visual counterfactual explanations, and tied predictions to business ROI.",
    "sampleAnswer": "In our churn prediction project, customer success managers were skeptical of an XGBoost model flagging key enterprise accounts as high churn risk. Rather than quoting ROC-AUC metrics, I utilized SHAP (SHapley Additive exPlanations) values to build an interactive dashboard showing exact contributing factors (e.g. 40% decline in weekly API usage over 14 days). This gave account executives actionable reasons to intervene, resulting in retaining 12 at-risk accounts worth $180,000 ARR.",
    "idealAnswer": "In our churn prediction project, customer success managers were skeptical of an XGBoost model flagging key enterprise accounts as high churn risk. Rather than quoting ROC-AUC metrics, I utilized SHAP (SHapley Additive exPlanations) values to build an interactive dashboard showing exact contributing factors (e.g. 40% decline in weekly API usage over 14 days). This gave account executives actionable reasons to intervene, resulting in retaining 12 at-risk accounts worth $180,000 ARR.",
    "keyConceptsToCover": [
      "SHAP / LIME Interpretability",
      "Stakeholder Communication",
      "Actionable ML Insights",
      "Quantified Business ROI"
    ],
    "followUps": [
      "How do you explain the trade-off between model accuracy and model interpretability to leadership?",
      "What ethical or bias audit steps do you perform before deploying user-facing ML models?"
    ]
  },
  {
    "id": "ml-data-engineer-culture-2acjh",
    "role": "ML/Data Engineer",
    "category": "culture",
    "difficulty": "medium",
    "question": "What are your best practices for MLOps, CI/CD for machine learning, and automated model governance?",
    "hint": "Data versioning (DVC), experiment tracking (MLflow/Weights & Biases), automated shadow/canary deployments, and model registry approval gates.",
    "sampleAnswer": "MLOps requires versioning code, data, and model artifacts simultaneously. I use DVC (Data Version Control) with Git to track dataset hashes and MLflow to log hyperparameters, loss curves, and artifact weights. In CI/CD, pull requests trigger automated model evaluation against regression benchmark suites. In production, new models deploy in shadow mode (mirroring production traffic without serving user responses) to verify latency and drift before canary rollout.",
    "idealAnswer": "MLOps requires versioning code, data, and model artifacts simultaneously. I use DVC (Data Version Control) with Git to track dataset hashes and MLflow to log hyperparameters, loss curves, and artifact weights. In CI/CD, pull requests trigger automated model evaluation against regression benchmark suites. In production, new models deploy in shadow mode (mirroring production traffic without serving user responses) to verify latency and drift before canary rollout.",
    "keyConceptsToCover": [
      "MLOps Pipelines",
      "DVC Data Versioning",
      "MLflow Model Registry",
      "Shadow Deployments",
      "Canary Rollout"
    ],
    "followUps": [
      "What are the key differences between traditional DevOps CI/CD and MLOps CI/CD/CT (Continuous Training)?",
      "How do you automate rollback when production model inference error rate spikes?"
    ]
  },
  {
    "id": "ml-data-engineer-custom-jd-5aj7o",
    "role": "ML/Data Engineer",
    "category": "custom-jd",
    "difficulty": "hard",
    "question": "Design a Retrieval-Augmented Generation (RAG) system with hybrid vector + keyword search, re-ranking, and hallucination guardrails.",
    "hint": "Chunking strategies, dense retrieval (Embeddings) + sparse retrieval (BM25) via Reciprocal Rank Fusion (RRF), Cross-Encoder re-ranker, LangChain / LlamaIndex.",
    "sampleAnswer": "I implement an enterprise RAG pipeline with semantic chunking (400-token chunks with 50-token overlap). Retrieval uses a hybrid approach: BM25 for precise keyword/acronym matching combined with dense vector embeddings (OpenAI/BGE) in a vector DB, merged via Reciprocal Rank Fusion (RRF). The top 25 candidates pass through a Cross-Encoder re-ranker (Cohere / BGE-Reranker) to extract the top 4 most relevant passages. A guardrail model validates that generated claims cite retrieved chunks to eliminate hallucinations.",
    "idealAnswer": "I implement an enterprise RAG pipeline with semantic chunking (400-token chunks with 50-token overlap). Retrieval uses a hybrid approach: BM25 for precise keyword/acronym matching combined with dense vector embeddings (OpenAI/BGE) in a vector DB, merged via Reciprocal Rank Fusion (RRF). The top 25 candidates pass through a Cross-Encoder re-ranker (Cohere / BGE-Reranker) to extract the top 4 most relevant passages. A guardrail model validates that generated claims cite retrieved chunks to eliminate hallucinations.",
    "keyConceptsToCover": [
      "Hybrid Search (BM25 + Dense Vectors)",
      "Reciprocal Rank Fusion",
      "Cross-Encoder Re-Ranking",
      "Hallucination Guardrails"
    ],
    "followUps": [
      "Why is Cross-Encoder re-ranking too computationally expensive for first-stage retrieval?",
      "How do you evaluate RAG quality using the Ragas framework (Faithfulness, Answer Relevance, Context Recall)?"
    ]
  },
  {
    "id": "ml-data-engineer-core-technical-nucze",
    "role": "ML/Data Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does distributed training work with PyTorch DDP (Distributed Data Parallel) versus FSDP (Fully Sharded Data Parallel) and DeepSpeed ZeRO?",
    "hint": "All-Reduce gradient synchronization, gradient sharding, model weight partitioning across GPUs, communication overhead.",
    "sampleAnswer": "In standard DDP, every GPU holds a complete replica of model parameters and optimizer states; GPUs compute forward/backward passes on unique batches and synchronize gradients via Ring All-Reduce. However, for models exceeding single-GPU VRAM (e.g. 70B LLMs), FSDP (Fully Sharded Data Parallel / ZeRO-3) shards model parameters, gradients, and optimizer states across all GPUs. Parameters are gathered all-to-all just-in-time for forward/backward computation and immediately freed, allowing massive models to fit in memory.",
    "idealAnswer": "In standard DDP, every GPU holds a complete replica of model parameters and optimizer states; GPUs compute forward/backward passes on unique batches and synchronize gradients via Ring All-Reduce. However, for models exceeding single-GPU VRAM (e.g. 70B LLMs), FSDP (Fully Sharded Data Parallel / ZeRO-3) shards model parameters, gradients, and optimizer states across all GPUs. Parameters are gathered all-to-all just-in-time for forward/backward computation and immediately freed, allowing massive models to fit in memory.",
    "keyConceptsToCover": [
      "PyTorch DDP",
      "FSDP (Fully Sharded Data Parallel)",
      "ZeRO-1/2/3 Sharding",
      "Ring All-Reduce"
    ],
    "followUps": [
      "What is the communication bottleneck in FSDP compared to standard DDP?",
      "How does mixed-precision training (FP16 / BF16) reduce VRAM requirements without causing numerical instability?"
    ]
  },
  {
    "id": "devops-cloud-engineer-system-design-kdzi3",
    "role": "DevOps & Cloud Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a multi-region zero-downtime Kubernetes deployment pipeline using GitOps, ArgoCD, and Istio service mesh for progressive canary rollouts.",
    "hint": "GitOps source of truth repository, ArgoCD sync, Argo Rollouts with Istio traffic split percentage (5% -> 20% -> 100%), automated Prometheus metric analysis.",
    "sampleAnswer": "I implement GitOps where the Git repository is the absolute desired state. ArgoCD monitors the cluster state and syncs manifests. For zero-downtime deployments, we use Argo Rollouts integrated with Istio. When a new image is pushed, Argo Rollouts launches a canary pod and Istio shifts 5% of ingress traffic to it. Prometheus continuously evaluates error rate and p99 latency SLAs. If error rates remain < 0.1% over 10 minutes, traffic ramps to 20%, 50%, and 100%. Any SLA breach triggers instant automated rollback.",
    "idealAnswer": "I implement GitOps where the Git repository is the absolute desired state. ArgoCD monitors the cluster state and syncs manifests. For zero-downtime deployments, we use Argo Rollouts integrated with Istio. When a new image is pushed, Argo Rollouts launches a canary pod and Istio shifts 5% of ingress traffic to it. Prometheus continuously evaluates error rate and p99 latency SLAs. If error rates remain < 0.1% over 10 minutes, traffic ramps to 20%, 50%, and 100%. Any SLA breach triggers instant automated rollback.",
    "keyConceptsToCover": [
      "GitOps & ArgoCD",
      "Canary Deployment",
      "Argo Rollouts",
      "Istio Traffic Shifting",
      "Automated Rollback"
    ],
    "followUps": [
      "What is the difference between Blue-Green deployments and Progressive Canary releases?",
      "How do you handle database schema migrations in a progressive canary rollout?"
    ]
  },
  {
    "id": "devops-cloud-engineer-core-technical-vuwb8",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how Kubernetes CNI (Container Network Interface) plugins like Cilium or Calico route packet traffic between pods across distinct worker nodes.",
    "hint": "eBPF vs iptables/IPVS, VXLAN overlay encapsulation vs BGP direct routing, kube-proxy replacement.",
    "sampleAnswer": "Kubernetes assigns each Pod a unique IP address. Traditional CNI plugins (like Calico/Flannel) use VXLAN overlay networks where inter-node pod packets are encapsulated inside UDP packets and routed via node Linux bridges and IP tables. Modern CNIs like Cilium replace kube-proxy and iptables entirely with eBPF (extended Berkeley Packet Filter). eBPF programs attached to Linux socket layers route packets directly in the kernel without traversing network stack layers, reducing latency and supporting high-throughput microservices.",
    "idealAnswer": "Kubernetes assigns each Pod a unique IP address. Traditional CNI plugins (like Calico/Flannel) use VXLAN overlay networks where inter-node pod packets are encapsulated inside UDP packets and routed via node Linux bridges and IP tables. Modern CNIs like Cilium replace kube-proxy and iptables entirely with eBPF (extended Berkeley Packet Filter). eBPF programs attached to Linux socket layers route packets directly in the kernel without traversing network stack layers, reducing latency and supporting high-throughput microservices.",
    "keyConceptsToCover": [
      "Kubernetes CNI",
      "Cilium eBPF",
      "VXLAN Overlay",
      "BGP Routing",
      "iptables vs eBPF"
    ],
    "followUps": [
      "Why does thousands of Kubernetes services degrade iptables performance, while eBPF scales with O(1) complexity?",
      "What is the difference between a ClusterIP and a NodePort service at the network layer?"
    ]
  },
  {
    "id": "devops-cloud-engineer-debugging-qr95r",
    "role": "DevOps & Cloud Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "A Kubernetes Pod is stuck in `CrashLoopBackOff` with exit code 137. How do you diagnose and permanently resolve it?",
    "hint": "Exit code 137 indicates SIGKILL (128 + 9), caused by Linux OOM-killer exceeding pod memory limits. Inspect kubectl describe pod, memory limits, JVM heap flags.",
    "sampleAnswer": "Exit code 137 is SIGKILL, almost universally caused by the Linux Out-Of-Memory (OOM) killer terminating a container that exceeded its defined resource limits (`resources.limits.memory`). I run `kubectl describe pod` to confirm 'OOMKilled: true' and inspect container exit reasons. I check Prometheus/Grafana metrics for memory trajectory leading up to the crash. Resolution involves fixing application memory leaks, tuning container runtime heaps (e.g. setting JVM `-XX:MaxRAMPercentage=75.0`), and right-sizing pod memory requests and limits.",
    "idealAnswer": "Exit code 137 is SIGKILL, almost universally caused by the Linux Out-Of-Memory (OOM) killer terminating a container that exceeded its defined resource limits (`resources.limits.memory`). I run `kubectl describe pod` to confirm 'OOMKilled: true' and inspect container exit reasons. I check Prometheus/Grafana metrics for memory trajectory leading up to the crash. Resolution involves fixing application memory leaks, tuning container runtime heaps (e.g. setting JVM `-XX:MaxRAMPercentage=75.0`), and right-sizing pod memory requests and limits.",
    "keyConceptsToCover": [
      "CrashLoopBackOff",
      "Exit Code 137",
      "Linux OOM-Killer",
      "Resource Limits & Requests",
      "Memory Profiling"
    ],
    "followUps": [
      "What is the difference between a Pod's memory 'request' and 'limit' regarding node scheduling and eviction?",
      "How does Kubernetes Quality of Service (QoS) classes (Guaranteed, Burstable, BestEffort) affect pod eviction priority?"
    ]
  },
  {
    "id": "devops-cloud-engineer-dsa-gezha",
    "role": "DevOps & Cloud Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an automated dependency topological sort for a DAG of infrastructure deployment modules in Terraform/Pulumi.",
    "hint": "Kahn's algorithm using in-degree counts or DFS post-order traversal with cycle detection.",
    "sampleAnswer": "I model infrastructure modules as directed acyclic graph (DAG) nodes where directed edges represent dependencies (e.g. VPC -> Subnet -> EKS Cluster -> Helm Chart). I implement Kahn's Algorithm: calculate the in-degree of all nodes, initialize a queue with zero in-degree nodes, and pop nodes while decrementing neighbor in-degrees. If the output count does not match total nodes, a circular dependency cycle exists and an error is thrown. The sorted output guarantees that prerequisite cloud resources are created before dependents.",
    "idealAnswer": "I model infrastructure modules as directed acyclic graph (DAG) nodes where directed edges represent dependencies (e.g. VPC -> Subnet -> EKS Cluster -> Helm Chart). I implement Kahn's Algorithm: calculate the in-degree of all nodes, initialize a queue with zero in-degree nodes, and pop nodes while decrementing neighbor in-degrees. If the output count does not match total nodes, a circular dependency cycle exists and an error is thrown. The sorted output guarantees that prerequisite cloud resources are created before dependents.",
    "keyConceptsToCover": [
      "Topological Sort",
      "Kahn's Algorithm",
      "DAG Cycle Detection",
      "Infrastructure as Code Dependencies"
    ],
    "followUps": [
      "How does Terraform internally detect circular dependencies in resource declarations?",
      "How do you parallelize the creation of non-dependent resources in a topological graph?"
    ]
  },
  {
    "id": "devops-cloud-engineer-behavioral-anpps",
    "role": "DevOps & Cloud Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you identified an insecure configuration or exposed credential in production and led the immediate incident response.",
    "hint": "STAR format: revoked exposed credentials, rotated secrets via AWS Secrets Manager/Vault, conducted blast-radius analysis in CloudTrail, and added git pre-commit scanning.",
    "sampleAnswer": "During an infrastructure audit, I discovered a developer had committed a long-lived AWS IAM access key to an internal repository. I immediately deactivated the access key in IAM to neutralize the vector, provisioned temporary credentials via AWS Secrets Manager, and queried AWS CloudTrail logs to confirm no unauthorized API calls had been made. To ensure systemic prevention, I added automated GitGuardian/TruffleHog pre-commit hooks and CI secret scanning.",
    "idealAnswer": "During an infrastructure audit, I discovered a developer had committed a long-lived AWS IAM access key to an internal repository. I immediately deactivated the access key in IAM to neutralize the vector, provisioned temporary credentials via AWS Secrets Manager, and queried AWS CloudTrail logs to confirm no unauthorized API calls had been made. To ensure systemic prevention, I added automated GitGuardian/TruffleHog pre-commit hooks and CI secret scanning.",
    "keyConceptsToCover": [
      "Secret Rotation",
      "CloudTrail Blast Radius",
      "IAM Least Privilege",
      "Automated Secret Scanning"
    ],
    "followUps": [
      "How do you enforce short-lived credentials using AWS IAM Roles and OIDC instead of static keys?",
      "What is the procedure for rotating root database passwords with zero downtime?"
    ]
  },
  {
    "id": "devops-cloud-engineer-culture-wi9uz",
    "role": "DevOps & Cloud Engineer",
    "category": "culture",
    "difficulty": "medium",
    "question": "How do you implement Infrastructure as Code (IaC) governance, state file locking, and multi-environment drift detection?",
    "hint": "Terraform state in S3 with DynamoDB locking, Atlantis/Spacelift for automated PR plans, and scheduled drift detection cron jobs.",
    "sampleAnswer": "I manage all cloud infrastructure through Terraform with remote state files stored in encrypted AWS S3 buckets paired with DynamoDB for state locking to prevent concurrent apply collisions. We implement Atlantis or Terraform Cloud to run `terraform plan` on GitHub pull requests, requiring peer approval before apply. For drift detection, scheduled cron pipelines run daily drift checks that alert Slack if manual console changes deviate from declared state.",
    "idealAnswer": "I manage all cloud infrastructure through Terraform with remote state files stored in encrypted AWS S3 buckets paired with DynamoDB for state locking to prevent concurrent apply collisions. We implement Atlantis or Terraform Cloud to run `terraform plan` on GitHub pull requests, requiring peer approval before apply. For drift detection, scheduled cron pipelines run daily drift checks that alert Slack if manual console changes deviate from declared state.",
    "keyConceptsToCover": [
      "Terraform State Locking",
      "DynamoDB State Locks",
      "GitOps IaC PR Workflows",
      "Drift Detection"
    ],
    "followUps": [
      "What happens if a Terraform process is killed mid-apply and leaves the DynamoDB lock active?",
      "How do you structure Terraform modules across dev, staging, and production environments (workspaces vs directory structure)?"
    ]
  },
  {
    "id": "devops-cloud-engineer-custom-jd-dzdrd",
    "role": "DevOps & Cloud Engineer",
    "category": "custom-jd",
    "difficulty": "hard",
    "question": "How do you design a Disaster Recovery (DR) strategy with RTO < 15 minutes and RPO < 1 minute across AWS regions for a critical financial application?",
    "hint": "Recovery Time Objective (RTO) vs Recovery Point Objective (RPO), Aurora Global Database replication, Route53 DNS failover, Terraform active-passive warm standby.",
    "sampleAnswer": "To achieve RPO < 1 minute, I use Amazon Aurora Global Database with asynchronous storage-level replication providing typical lag under 1 second. Application stateless services are deployed in a warm-standby configuration in the secondary region with minimal pod replicas. To achieve RTO < 15 minutes, AWS Route 53 Application Recovery Controller monitors primary health. Upon primary region failure, automated runbooks trigger Route 53 DNS failover and scale secondary Kubernetes pods from 2 to 50 within 4 minutes.",
    "idealAnswer": "To achieve RPO < 1 minute, I use Amazon Aurora Global Database with asynchronous storage-level replication providing typical lag under 1 second. Application stateless services are deployed in a warm-standby configuration in the secondary region with minimal pod replicas. To achieve RTO < 15 minutes, AWS Route 53 Application Recovery Controller monitors primary health. Upon primary region failure, automated runbooks trigger Route 53 DNS failover and scale secondary Kubernetes pods from 2 to 50 within 4 minutes.",
    "keyConceptsToCover": [
      "RTO & RPO",
      "Aurora Global Database",
      "Route 53 DNS Failover",
      "Warm Standby DR",
      "Cross-Region Replication"
    ],
    "followUps": [
      "What is the difference between Hot Standby, Warm Standby, and Pilot Light DR strategies?",
      "How do you test cross-region disaster recovery runbooks in production without causing customer downtime?"
    ]
  },
  {
    "id": "devops-cloud-engineer-core-technical-i0uln",
    "role": "DevOps & Cloud Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How do Linux cgroups (control groups) and namespaces isolate CPU, memory, and networking in Docker containers?",
    "hint": "Namespaces provide visibility isolation (PID, NET, MNT, IPC, UTS); cgroups enforce resource limitations (CPU shares/quotas, Memory hard/soft limits).",
    "sampleAnswer": "Containers are not virtual machines; they are standard Linux processes isolated by kernel features. Namespaces partition what a process can SEE: PID namespace gives container PID 1, NET provides isolated network interfaces/ports, and MNT provides private root filesystems. Cgroups govern what a process can USE: cgroup memory limits trigger OOM-killers if exceeded, and CFS (Completely Fair Scheduler) cgroup quotas limit CPU shares. Docker is simply a wrapper orchestrating these kernel primitives.",
    "idealAnswer": "Containers are not virtual machines; they are standard Linux processes isolated by kernel features. Namespaces partition what a process can SEE: PID namespace gives container PID 1, NET provides isolated network interfaces/ports, and MNT provides private root filesystems. Cgroups govern what a process can USE: cgroup memory limits trigger OOM-killers if exceeded, and CFS (Completely Fair Scheduler) cgroup quotas limit CPU shares. Docker is simply a wrapper orchestrating these kernel primitives.",
    "keyConceptsToCover": [
      "Linux Namespaces",
      "cgroups (Control Groups)",
      "CFS Quota",
      "Container Isolation vs Virtual Machines"
    ],
    "followUps": [
      "What happens when a container exceeds its memory limit versus when it exceeds its CPU quota?",
      "How does cgroups v2 improve memory and I/O isolation over cgroups v1?"
    ]
  },
  {
    "id": "cloud-sre-core-technical-65v2g",
    "role": "Cloud / SRE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain the Google SRE principles of Error Budgets, Service Level Indicators (SLIs), and Service Level Objectives (SLOs). How do they guide feature velocity vs stability?",
    "hint": "SLI: quantitative measure of service performance. SLO: target percentage (e.g. 99.9%). Error Budget = 100% - SLO. When exhausted, feature freezes occur.",
    "sampleAnswer": "An SLI is a concrete metric (e.g. proportion of HTTP requests returning < 200ms with 2xx status). An SLO is the agreed reliability target (e.g. 99.9% over a rolling 30-day window). The Error Budget (0.1%) represents acceptable unreliability. If the service consumes its error budget due to outages, product feature deployments are halted, and engineering focus shifts entirely to resilience, testing, and automation until the budget replenishes.",
    "idealAnswer": "An SLI is a concrete metric (e.g. proportion of HTTP requests returning < 200ms with 2xx status). An SLO is the agreed reliability target (e.g. 99.9% over a rolling 30-day window). The Error Budget (0.1%) represents acceptable unreliability. If the service consumes its error budget due to outages, product feature deployments are halted, and engineering focus shifts entirely to resilience, testing, and automation until the budget replenishes.",
    "keyConceptsToCover": [
      "SLI / SLO / SLA",
      "Error Budgets",
      "Reliability Engineering",
      "Deployment Freezes"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-system-design-xyli6",
    "role": "Cloud / SRE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a centralized observability and telemetry architecture processing 500GB of logs, metrics, and traces daily with OpenTelemetry, Prometheus, and Grafana Tempo.",
    "hint": "OpenTelemetry collectors, Prometheus for metrics, Loki for structured log streaming, Tempo/Jaeger for distributed tracing with head-based and tail-based sampling.",
    "sampleAnswer": "I design an observability pipeline using OpenTelemetry Collectors running as DaemonSets on every Kubernetes node. Application runtimes emit OTLP traces, Prometheus metrics, and JSON logs. Collectors apply tail-based sampling (retaining 100% of error traces and 5% of healthy traces) and forward metrics to VictoriaMetrics/Prometheus, traces to Grafana Tempo backed by S3, and logs to Grafana Loki. Grafana dashboards correlate trace IDs directly into log streams.",
    "idealAnswer": "I design an observability pipeline using OpenTelemetry Collectors running as DaemonSets on every Kubernetes node. Application runtimes emit OTLP traces, Prometheus metrics, and JSON logs. Collectors apply tail-based sampling (retaining 100% of error traces and 5% of healthy traces) and forward metrics to VictoriaMetrics/Prometheus, traces to Grafana Tempo backed by S3, and logs to Grafana Loki. Grafana dashboards correlate trace IDs directly into log streams.",
    "keyConceptsToCover": [
      "OpenTelemetry Collector",
      "Tail-Based Sampling",
      "Grafana Tempo Tracing",
      "Loki Log Aggregation",
      "VictoriaMetrics"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-debugging-j0flx",
    "role": "Cloud / SRE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "Production ingress error rate spikes to 15% with HTTP 502 Bad Gateway and 504 Gateway Timeout during a marketing surge. Triage step-by-step.",
    "hint": "502 indicates proxy failed to connect to upstream pod. 504 indicates upstream took too long. Check ingress controller logs, pod readiness probes, connection pooling.",
    "sampleAnswer": "502 means the Ingress (Nginx/Envoy) tried connecting to an upstream Pod IP that refused or dropped the connection (pod crashed or terminated). 504 means the upstream pod accepted the connection but exceeded the proxy read timeout (database lock or thread starvation). I check `kubectl get pods` for restarts and CPU saturation, verify if the pod readiness probe failed, and inspect Ingress connection pool saturation. If pods are healthy, I increase upstream backend timeouts and scale replicas.",
    "idealAnswer": "502 means the Ingress (Nginx/Envoy) tried connecting to an upstream Pod IP that refused or dropped the connection (pod crashed or terminated). 504 means the upstream pod accepted the connection but exceeded the proxy read timeout (database lock or thread starvation). I check `kubectl get pods` for restarts and CPU saturation, verify if the pod readiness probe failed, and inspect Ingress connection pool saturation. If pods are healthy, I increase upstream backend timeouts and scale replicas.",
    "keyConceptsToCover": [
      "HTTP 502 vs 504",
      "Ingress Nginx / Envoy",
      "Readiness Probe Failures",
      "Upstream Timeouts",
      "Connection Pool Exhaustion"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-dsa-u14pu",
    "role": "Cloud / SRE",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an automated sliding-window burn rate alert algorithm for SRE error budgets.",
    "hint": "Multi-window, multi-burn-rate alerts (e.g. 14.4x burn rate over 1 hour, 6x burn rate over 6 hours) to alert on rapid vs slow budget exhaustion.",
    "sampleAnswer": "Traditional single-threshold alerts trigger false alarms or fire too late. I implement Google's Multi-Window Multi-Burn-Rate alerting algorithm. A burn rate of 1 consumes the entire error budget in exactly 30 days. We define two coordinated alert windows: A fast-burn alert (14.4x burn rate over 1 hour consuming 2% of budget, backed by a 5-minute confirmation window) triggers an immediate P1 pager. A slow-burn alert (6x burn rate over 6 hours consuming 5% of budget) sends a non-urgent ticket.",
    "idealAnswer": "Traditional single-threshold alerts trigger false alarms or fire too late. I implement Google's Multi-Window Multi-Burn-Rate alerting algorithm. A burn rate of 1 consumes the entire error budget in exactly 30 days. We define two coordinated alert windows: A fast-burn alert (14.4x burn rate over 1 hour consuming 2% of budget, backed by a 5-minute confirmation window) triggers an immediate P1 pager. A slow-burn alert (6x burn rate over 6 hours consuming 5% of budget) sends a non-urgent ticket.",
    "keyConceptsToCover": [
      "Error Budget Burn Rate",
      "Multi-Window Multi-Burn-Rate",
      "Alert Paging vs Tickets",
      "Sliding Window Analysis"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-behavioral-rlgx3",
    "role": "Cloud / SRE",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Walk me through a high-severity incident where you acted as Incident Commander (IC). How did you coordinate engineering response under extreme pressure?",
    "hint": "STAR format: established single communication channel, delegated roles (Operations Lead, Communications Lead), maintained running timeline, and prevented executive interference.",
    "sampleAnswer": "During an outage affecting our primary payment gateway, I stepped in as Incident Commander. I opened a dedicated incident bridge, assigned one engineer as Ops Lead to test fixes and another as Comms Lead to update customer status pages every 15 minutes. When executives joined requesting root-cause explanations, I shielded the technical team by scheduling a separate briefing, allowing the engineers to isolate the firewall rule and restore services in 19 minutes.",
    "idealAnswer": "During an outage affecting our primary payment gateway, I stepped in as Incident Commander. I opened a dedicated incident bridge, assigned one engineer as Ops Lead to test fixes and another as Comms Lead to update customer status pages every 15 minutes. When executives joined requesting root-cause explanations, I shielded the technical team by scheduling a separate briefing, allowing the engineers to isolate the firewall rule and restore services in 19 minutes.",
    "keyConceptsToCover": [
      "Incident Commander Role",
      "Bridge Facilitation",
      "Executive Shielding",
      "Cadenced Status Updates"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-culture-zaepk",
    "role": "Cloud / SRE",
    "category": "culture",
    "difficulty": "medium",
    "question": "What is Chaos Engineering, and how do you implement controlled failure injection using tools like Chaos Mesh or LitmusChaos in staging and production?",
    "hint": "Principles of Chaos Engineering, hypothesis testing, blast radius control, automated game days, network latency injection, pod kill experiments.",
    "sampleAnswer": "Chaos engineering is the discipline of experimenting on a system to build confidence in its capability to withstand turbulent conditions. Using Chaos Mesh, we formulate steady-state hypotheses (e.g. '99.9% of user requests succeed even if 1 of 3 Redis nodes dies'). We inject controlled faults: random pod kills, packet loss, DNS latency, and disk pressure. If steady-state metrics drop beyond acceptable bounds, experiments halt automatically, and weaknesses are remediated.",
    "idealAnswer": "Chaos engineering is the discipline of experimenting on a system to build confidence in its capability to withstand turbulent conditions. Using Chaos Mesh, we formulate steady-state hypotheses (e.g. '99.9% of user requests succeed even if 1 of 3 Redis nodes dies'). We inject controlled faults: random pod kills, packet loss, DNS latency, and disk pressure. If steady-state metrics drop beyond acceptable bounds, experiments halt automatically, and weaknesses are remediated.",
    "keyConceptsToCover": [
      "Chaos Engineering",
      "Blast Radius Containment",
      "Steady-State Hypothesis",
      "Chaos Mesh / LitmusChaos",
      "Fault Injection"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-core-technical-nczel",
    "role": "Cloud / SRE",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does Linux TCP SYN Flood attack work, and how do SYN Cookies and firewall connection tracking mitigate it?",
    "hint": "TCP 3-way handshake, half-open connections filling backlog queue, SYN cookies encoding connection parameters in initial sequence number without allocating memory.",
    "sampleAnswer": "In a SYN flood, an attacker sends thousands of TCP SYN packets with spoofed source IPs and never completes the handshake with an ACK. The server allocates TCB (Transmission Control Block) memory for each half-open connection until the SYN backlog queue overflows, rejecting legitimate users. SYN Cookies solve this by having the server encode connection state cryptographically into the 32-bit initial sequence number (ISN) of the SYN-ACK, allocating zero memory until the valid client ACK returns.",
    "idealAnswer": "In a SYN flood, an attacker sends thousands of TCP SYN packets with spoofed source IPs and never completes the handshake with an ACK. The server allocates TCB (Transmission Control Block) memory for each half-open connection until the SYN backlog queue overflows, rejecting legitimate users. SYN Cookies solve this by having the server encode connection state cryptographically into the 32-bit initial sequence number (ISN) of the SYN-ACK, allocating zero memory until the valid client ACK returns.",
    "keyConceptsToCover": [
      "TCP SYN Flood",
      "SYN Cookies",
      "Backlog Queue",
      "Half-Open Connections",
      "Kernel Hardening"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-system-design-kvx8g",
    "role": "Cloud / SRE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design a global automated SSL/TLS certificate lifecycle management system handling 100,000 custom domains using Let's Encrypt and cert-manager.",
    "hint": "ACME protocol (HTTP-01 vs DNS-01 challenges), cert-manager on Kubernetes, automated renewal 30 days prior to expiry, rate limiting mitigation.",
    "sampleAnswer": "I architect the certificate management system using cert-manager on Kubernetes. For 100,000 custom customer domains, we use HTTP-01 challenges routed through our global Envoy ingress cluster to an internal ACME solver pod. Cert-manager schedules automated renewals 30 days prior to expiry. To avoid Let's Encrypt production rate limits (50 certs per registered domain per week), we implement an internal queue with exponential backoff and store wildcard certificates in HashiCorp Vault.",
    "idealAnswer": "I architect the certificate management system using cert-manager on Kubernetes. For 100,000 custom customer domains, we use HTTP-01 challenges routed through our global Envoy ingress cluster to an internal ACME solver pod. Cert-manager schedules automated renewals 30 days prior to expiry. To avoid Let's Encrypt production rate limits (50 certs per registered domain per week), we implement an internal queue with exponential backoff and store wildcard certificates in HashiCorp Vault.",
    "keyConceptsToCover": [
      "ACME Protocol",
      "HTTP-01 vs DNS-01 Challenges",
      "cert-manager",
      "Let's Encrypt Rate Limits",
      "HashiCorp Vault"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-core-technical-s420j",
    "role": "Data Analyst",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Write and explain an advanced SQL query using Window Functions (`ROW_NUMBER`, `DENSE_RANK`, `LEAD`, `LAG`) to calculate month-over-month user retention cohorts.",
    "hint": "DATE_TRUNC, cohort grouping, MIN(order_date) as first_month, self-join or window function comparing activity month vs cohort month.",
    "sampleAnswer": "To build a cohort retention matrix, I first identify each user's signup month using `DATE_TRUNC('month', MIN(event_date)) OVER (PARTITION BY user_id) AS cohort_month`. In the outer query, I calculate the elapsed months between active month and cohort month: `(EXTRACT(year FROM event_date) - EXTRACT(year FROM cohort_month)) * 12 + EXTRACT(month FROM event_date) - EXTRACT(month FROM cohort_month) AS period_index`. I group by cohort_month and period_index to output user counts and divide by initial cohort size to produce the retention percentage.",
    "idealAnswer": "To build a cohort retention matrix, I first identify each user's signup month using `DATE_TRUNC('month', MIN(event_date)) OVER (PARTITION BY user_id) AS cohort_month`. In the outer query, I calculate the elapsed months between active month and cohort month: `(EXTRACT(year FROM event_date) - EXTRACT(year FROM cohort_month)) * 12 + EXTRACT(month FROM event_date) - EXTRACT(month FROM cohort_month) AS period_index`. I group by cohort_month and period_index to output user counts and divide by initial cohort size to produce the retention percentage.",
    "keyConceptsToCover": [
      "SQL Window Functions",
      "Cohort Retention Analysis",
      "DATE_TRUNC",
      "Self-Join Aggregation",
      "Retention Curves"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-system-design-14gae",
    "role": "Data Analyst",
    "category": "system-design",
    "difficulty": "medium",
    "question": "How do you design a Star Schema vs Snowflake Schema for an e-commerce analytics warehouse in Snowflake / BigQuery / Redshift?",
    "hint": "Fact tables (Orders, Transactions) vs Dimension tables (Customers, Products, Dates). Star schema denormalizes dimensions for faster joins; Snowflake normalizes dimensions.",
    "sampleAnswer": "In modern columnar data warehouses (Snowflake, BigQuery), I prefer a Star Schema. Fact tables store high-volume quantitative event metrics (e.g. `fact_orders` with order_id, customer_id, product_id, revenue, discount, timestamp). Dimension tables (`dim_customers`, `dim_products`, `dim_date`) store descriptive attributes denormalized. Modern columnar storage handles wide, denormalized tables with high compression and eliminates costly multi-table joins required by Snowflake schemas.",
    "idealAnswer": "In modern columnar data warehouses (Snowflake, BigQuery), I prefer a Star Schema. Fact tables store high-volume quantitative event metrics (e.g. `fact_orders` with order_id, customer_id, product_id, revenue, discount, timestamp). Dimension tables (`dim_customers`, `dim_products`, `dim_date`) store descriptive attributes denormalized. Modern columnar storage handles wide, denormalized tables with high compression and eliminates costly multi-table joins required by Snowflake schemas.",
    "keyConceptsToCover": [
      "Star Schema",
      "Snowflake Schema",
      "Fact vs Dimension Tables",
      "Columnar Storage Optimization",
      "Denormalization"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-core-technical-c0nyr",
    "role": "Data Analyst",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Explain the statistical difference between A/B Test P-value, Statistical Power (1 - Beta), and Minimum Detectable Effect (MDE). How do you determine required sample size?",
    "hint": "Type I error (alpha, false positive), Type II error (beta, false negative, power = 80%), MDE calculation based on baseline conversion rate and sample size.",
    "sampleAnswer": "A p-value measures the probability of observing results as extreme as the test data assuming the null hypothesis is true (typically alpha = 0.05). Statistical Power (typically 80%) is the probability of correctly detecting a true effect when one exists, preventing Type II errors (false negatives). The Minimum Detectable Effect (MDE) is the smallest lift the test can reliably detect. Required sample size per variant is inversely proportional to MDE squared: $N \\approx 16 \\sigma^2 / \\text{MDE}^2$.",
    "idealAnswer": "A p-value measures the probability of observing results as extreme as the test data assuming the null hypothesis is true (typically alpha = 0.05). Statistical Power (typically 80%) is the probability of correctly detecting a true effect when one exists, preventing Type II errors (false negatives). The Minimum Detectable Effect (MDE) is the smallest lift the test can reliably detect. Required sample size per variant is inversely proportional to MDE squared: $N \\approx 16 \\sigma^2 / \\text{MDE}^2$.",
    "keyConceptsToCover": [
      "A/B Testing",
      "P-value",
      "Statistical Power (1 - Beta)",
      "Minimum Detectable Effect (MDE)",
      "Sample Size Sizing"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-debugging-6wpqm",
    "role": "Data Analyst",
    "category": "debugging",
    "difficulty": "medium",
    "question": "During an executive dashboard review, the reported Net Revenue from the analytics warehouse differs by 8.4% from Stripe's financial billing report. How do you reconcile the discrepancy?",
    "hint": "Triage time zone mismatches (UTC vs EST), refund/chargeback timing, currency conversion exchange rates, and deduplication of transaction webhooks.",
    "sampleAnswer": "I follow a systematic financial reconciliation framework: 1) Verify time zone alignment: ensure the warehouse query uses UTC corresponding to Stripe's balance transaction cutoffs. 2) Accounting classification: verify whether the analytics definition includes gross volume while Stripe reports net of refunds, chargebacks, and gateway processing fees. 3) Currency conversion: inspect whether multi-currency transactions use transaction-day exchange rates vs month-end rates. 4) Data pipeline completeness: check for dropped webhook events or duplicate idempotency keys.",
    "idealAnswer": "I follow a systematic financial reconciliation framework: 1) Verify time zone alignment: ensure the warehouse query uses UTC corresponding to Stripe's balance transaction cutoffs. 2) Accounting classification: verify whether the analytics definition includes gross volume while Stripe reports net of refunds, chargebacks, and gateway processing fees. 3) Currency conversion: inspect whether multi-currency transactions use transaction-day exchange rates vs month-end rates. 4) Data pipeline completeness: check for dropped webhook events or duplicate idempotency keys.",
    "keyConceptsToCover": [
      "Financial Reconciliation",
      "Time Zone Normalization",
      "Gross vs Net Revenue",
      "Chargeback & Refund Timing",
      "Data Lineage"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-dsa-215gt",
    "role": "Data Analyst",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an automated anomaly detection algorithm in Python (Pandas/NumPy) using IQR (Interquartile Range) and Z-Score for daily active metric spikes/dips.",
    "hint": "IQR = Q3 - Q1, bounds = [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. Z-score = (x - mean)/std > 3. Handle seasonality using rolling 7-day median.",
    "sampleAnswer": "For metrics with normal distributions, Z-score identifies anomalies where $|z| > 3$. However, real business metrics frequently exhibit skew and outliers, making the Interquartile Range (IQR) far more robust. I compute the 25th percentile (Q1) and 75th percentile (Q3). The IQR is Q3 - Q1, with lower bound $Q1 - 1.5 \\times IQR$ and upper bound $Q3 + 1.5 \\times IQR$. To account for day-of-week seasonality, I evaluate metrics relative to a 7-day rolling window rather than global averages.",
    "idealAnswer": "For metrics with normal distributions, Z-score identifies anomalies where $|z| > 3$. However, real business metrics frequently exhibit skew and outliers, making the Interquartile Range (IQR) far more robust. I compute the 25th percentile (Q1) and 75th percentile (Q3). The IQR is Q3 - Q1, with lower bound $Q1 - 1.5 \\times IQR$ and upper bound $Q3 + 1.5 \\times IQR$. To account for day-of-week seasonality, I evaluate metrics relative to a 7-day rolling window rather than global averages.",
    "keyConceptsToCover": [
      "IQR Anomaly Detection",
      "Z-Score",
      "Robust Statistics",
      "Day-of-Week Seasonality",
      "Rolling Median"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-behavioral-eliim",
    "role": "Data Analyst",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time your data analysis directly challenged a leadership team's pre-conceived hypothesis or product intuition.",
    "hint": "STAR format: leadership believed a new onboarding flow was successful due to high signups; analysis proved 30-day retention and activation dropped 40%.",
    "sampleAnswer": "Leadership was enthusiastic about a simplified 1-click onboarding flow because raw signup volume increased by 35%. However, when I tracked user cohort activation (defined as sending at least 3 messages in week 1), 30-day retention had plummeted by 42%. I presented a funnel analysis showing users lacked contextual setup to realize product value. Based on my data, leadership agreed to reinstate a guided 3-step setup wizard, which boosted 30-day customer lifetime value (LTV) by 28%.",
    "idealAnswer": "Leadership was enthusiastic about a simplified 1-click onboarding flow because raw signup volume increased by 35%. However, when I tracked user cohort activation (defined as sending at least 3 messages in week 1), 30-day retention had plummeted by 42%. I presented a funnel analysis showing users lacked contextual setup to realize product value. Based on my data, leadership agreed to reinstate a guided 3-step setup wizard, which boosted 30-day customer lifetime value (LTV) by 28%.",
    "keyConceptsToCover": [
      "Data-Driven Influence",
      "Funnel Conversion Analysis",
      "Activation Metrics",
      "Cohort Retention"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-culture-zcua9",
    "role": "Data Analyst",
    "category": "culture",
    "difficulty": "medium",
    "question": "How do you implement data governance, data dictionaries, and automated test assertions using tools like dbt (data build tool)?",
    "hint": "dbt tests (unique, not_null, accepted_values, relationships), schema.yml documentation, data freshness assertions, CI/CD data pipelines.",
    "sampleAnswer": "I implement dbt as our centralized transformation and modeling framework. Every transformation model includes a `schema.yml` file defining documentation, owner, and automated testing constraints (`unique`, `not_null`, foreign key `relationships`, and `accepted_values`). In our CI pipeline, pull requests test models on isolated database schemas before merging. For pipeline reliability, we schedule `dbt source freshness` checks that trigger alerts if source data ingest falls behind.",
    "idealAnswer": "I implement dbt as our centralized transformation and modeling framework. Every transformation model includes a `schema.yml` file defining documentation, owner, and automated testing constraints (`unique`, `not_null`, foreign key `relationships`, and `accepted_values`). In our CI pipeline, pull requests test models on isolated database schemas before merging. For pipeline reliability, we schedule `dbt source freshness` checks that trigger alerts if source data ingest falls behind.",
    "keyConceptsToCover": [
      "dbt (data build tool)",
      "Schema Assertions",
      "Data Freshness",
      "Data Lineage",
      "Data Dictionaries"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-core-technical-ttvgy",
    "role": "Data Analyst",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "What is Simpson's Paradox in statistical analysis, and how can failing to recognize it lead to catastrophic product decisions?",
    "hint": "A trend appears in several groups of data but disappears or reverses when the groups are combined due to an unaddressed confounding variable.",
    "sampleAnswer": "Simpson's Paradox occurs when an observed trend within multiple subgroups reverses when the data is aggregated into a single pool. For example, Conversion Rate of Feature B looks higher than Feature A overall, but when broken down by device type, Feature A outperforms Feature B on both Mobile and Desktop! The paradox occurred because Feature B had a much higher proportion of Desktop traffic, which inherently converts higher. Failing to control for confounding variables causes teams to deploy inferior features.",
    "idealAnswer": "Simpson's Paradox occurs when an observed trend within multiple subgroups reverses when the data is aggregated into a single pool. For example, Conversion Rate of Feature B looks higher than Feature A overall, but when broken down by device type, Feature A outperforms Feature B on both Mobile and Desktop! The paradox occurred because Feature B had a much higher proportion of Desktop traffic, which inherently converts higher. Failing to control for confounding variables causes teams to deploy inferior features.",
    "keyConceptsToCover": [
      "Simpson's Paradox",
      "Confounding Variables",
      "Subgroup Segmentation",
      "A/B Testing Biases"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  }
,
  {
    "id": "mobile-app-developer-core-technical-jcndx",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain the React Native / Flutter rendering engine (Bridge vs JSI/Fabric vs Flutter Impeller/Skia) and how memory and touch events are processed at 120Hz.",
    "hint": "React Native legacy Bridge serialization vs JSI C++ direct invocation; Flutter C++ engine compiling directly to native GPU commands.",
    "sampleAnswer": "Legacy React Native utilized an asynchronous JSON bridge across three threads (JS, Shadow, Native), which bottlenecked high-frequency gestures. The New Architecture replaces the bridge with JSI (JavaScript Interface), allowing JavaScript to hold direct C++ memory references to native host objects, enabling synchronous layout calculation with Fabric and TurboModules. In contrast, Flutter bypasses native OEM platform widgets entirely, compiling Dart to native ARM code and drawing every pixel directly onto the GPU canvas via Impeller/Skia at 120 FPS.",
    "idealAnswer": "Legacy React Native utilized an asynchronous JSON bridge across three threads (JS, Shadow, Native), which bottlenecked high-frequency gestures. The New Architecture replaces the bridge with JSI (JavaScript Interface), allowing JavaScript to hold direct C++ memory references to native host objects, enabling synchronous layout calculation with Fabric and TurboModules. In contrast, Flutter bypasses native OEM platform widgets entirely, compiling Dart to native ARM code and drawing every pixel directly onto the GPU canvas via Impeller/Skia at 120 FPS.",
    "keyConceptsToCover": [
      "React Native JSI",
      "Fabric Renderer",
      "Flutter Impeller",
      "Thread Marshaling",
      "120Hz Gestures"
    ],
    "followUps": [
      "Why did React Native move away from the asynchronous JSON bridge?",
      "How does Flutter maintain consistent UI rendering across fragmented Android OEMs?"
    ]
  },
  {
    "id": "mobile-app-developer-system-design-qvvo0",
    "role": "Mobile App Developer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an offline-first mobile sync architecture for a field inspection app with photo attachments and intermittent cellular connectivity.",
    "hint": "Local SQLite/WatermelonDB/Realm, background sync queue (WorkManager / BGTaskScheduler), chunked S3 uploads with resumable protocols (Tus).",
    "sampleAnswer": "I architect the app using an offline-first pattern with WatermelonDB (SQLite). All user form entries and mutations immediately write to local SQLite with a sync status 'pending'. Photo attachments are saved to local filesystem cache. A background worker (Android WorkManager and iOS BGTaskScheduler) executes opportunistic syncing when connectivity is detected. Photo uploads use the Tus resumable protocol to handle dropped network packets. If conflict arises, server timestamp vectors determine deterministic merge.",
    "idealAnswer": "I architect the app using an offline-first pattern with WatermelonDB (SQLite). All user form entries and mutations immediately write to local SQLite with a sync status 'pending'. Photo attachments are saved to local filesystem cache. A background worker (Android WorkManager and iOS BGTaskScheduler) executes opportunistic syncing when connectivity is detected. Photo uploads use the Tus resumable protocol to handle dropped network packets. If conflict arises, server timestamp vectors determine deterministic merge.",
    "keyConceptsToCover": [
      "Offline-First Sync",
      "WatermelonDB / SQLite",
      "Resumable Uploads (Tus)",
      "WorkManager / BGTaskScheduler",
      "Conflict Resolution"
    ],
    "followUps": [
      "How do you manage battery and thermal constraints during background photo synchronization?",
      "How do you detect whether network connectivity is a captive portal with zero real internet?"
    ]
  },
  {
    "id": "mobile-app-developer-debugging-otj07",
    "role": "Mobile App Developer",
    "category": "debugging",
    "difficulty": "medium",
    "question": "A production iOS/Android app crashes intermittently on launch (ANR / Crashlytics SIGSEGV) for 1% of users after an app store update. Triage and fix.",
    "hint": "Symbolicate crash logs with dSYM / ProGuard mapping files, inspect Native vs JS exceptions, database schema migration failure in SQLite.",
    "sampleAnswer": "I first download the crash stack trace from Firebase Crashlytics and symbolicate it using our CI's dSYM / ProGuard mapping file. If the crash occurs at app launch before JS bundle initialization, it is typically a native SQLite schema migration failure (e.g. missing column migration during app upgrade) or unhandled native library initialization (e.g. push notification SDK). I inspect device OS versions and reproduce by upgrading an older app build directly to the new version on a physical test device.",
    "idealAnswer": "I first download the crash stack trace from Firebase Crashlytics and symbolicate it using our CI's dSYM / ProGuard mapping file. If the crash occurs at app launch before JS bundle initialization, it is typically a native SQLite schema migration failure (e.g. missing column migration during app upgrade) or unhandled native library initialization (e.g. push notification SDK). I inspect device OS versions and reproduce by upgrading an older app build directly to the new version on a physical test device.",
    "keyConceptsToCover": [
      "Symbolication (dSYM / ProGuard)",
      "Crashlytics Triage",
      "SQLite Schema Migrations",
      "ANR (Application Not Responding)"
    ],
    "followUps": [
      "What causes Application Not Responding (ANR) on Android, and how do you profile the main UI thread?",
      "How do you roll out an emergency hotfix via CodePush without waiting for App Store review?"
    ]
  },
  {
    "id": "mobile-app-developer-dsa-d8mf5",
    "role": "Mobile App Developer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an in-memory LRU image cache for mobile devices with automatic memory-warning eviction.",
    "hint": "Doubly linked list + Map with total byte size budget, listening to UIApplicationDidReceiveMemoryWarningNotification / onTrimMemory.",
    "sampleAnswer": "I implement an LRU cache storing image bitmap byte buffers. In addition to a max entry count, the cache maintains an explicit byte capacity (e.g. 64MB). When put(key, bitmap) is called, it evicts tail nodes until memory fits. Crucially for mobile, the cache registers for OS memory pressure notifications (iOS `didReceiveMemoryWarningNotification` and Android `ComponentCallbacks2.onTrimMemory`). When low memory is signaled, the cache immediately purges all inactive cached bitmaps to prevent the OS from terminating the process.",
    "idealAnswer": "I implement an LRU cache storing image bitmap byte buffers. In addition to a max entry count, the cache maintains an explicit byte capacity (e.g. 64MB). When put(key, bitmap) is called, it evicts tail nodes until memory fits. Crucially for mobile, the cache registers for OS memory pressure notifications (iOS `didReceiveMemoryWarningNotification` and Android `ComponentCallbacks2.onTrimMemory`). When low memory is signaled, the cache immediately purges all inactive cached bitmaps to prevent the OS from terminating the process.",
    "keyConceptsToCover": [
      "LRU Cache",
      "Memory Pressure Eviction",
      "onTrimMemory",
      "Bitmap Recycling"
    ],
    "followUps": [
      "Why is bitmap memory allocation particularly prone to out-of-memory (OOM) crashes on Android?",
      "What is the difference between caching decoded Bitmaps vs raw compressed JPEG/PNG bytes?"
    ]
  },
  {
    "id": "mobile-app-developer-behavioral-3s2oa",
    "role": "Mobile App Developer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Tell me about a time you had to reject an App Store or Google Play Store policy guideline requirement, or resolve an unexpected app rejection.",
    "hint": "STAR format: App Store guideline rejection (e.g. account deletion, in-app purchase 3.1.1, privacy permissions), clear mitigation, and fast re-submission.",
    "sampleAnswer": "Apple rejected our app under Guideline 5.1.1 for requesting location permissions without sufficient justification in the modal dialog. I rewrote the `NSLocationWhenInUseUsageDescription` in Info.plist to clearly explain the user benefit ('Your location is used exclusively to show nearby pickup hubs') and added an upfront in-app educational screen before triggering the native permission dialog. We submitted an expedited review appeal with video documentation and were approved within 14 hours.",
    "idealAnswer": "Apple rejected our app under Guideline 5.1.1 for requesting location permissions without sufficient justification in the modal dialog. I rewrote the `NSLocationWhenInUseUsageDescription` in Info.plist to clearly explain the user benefit ('Your location is used exclusively to show nearby pickup hubs') and added an upfront in-app educational screen before triggering the native permission dialog. We submitted an expedited review appeal with video documentation and were approved within 14 hours.",
    "keyConceptsToCover": [
      "App Store Review Guidelines",
      "Permission Justification",
      "Expedited Appeal",
      "Policy Compliance"
    ],
    "followUps": [
      "How do you structure in-app purchases (IAP) vs third-party payments under Apple Guideline 3.1.1?",
      "What are the requirements for account deletion under recent Apple and Google privacy policies?"
    ]
  },
  {
    "id": "mobile-app-developer-culture-esoyw",
    "role": "Mobile App Developer",
    "category": "culture",
    "difficulty": "medium",
    "question": "How do you automate mobile CI/CD pipelines using Fastlane, GitHub Actions, and TestFlight / Play Console internal tracks?",
    "hint": "Automated version code bumping, code signing certificates via Fastlane Match, headless UI testing, and automated release tracks.",
    "sampleAnswer": "I manage mobile deployment via Fastlane scripts integrated into GitHub Actions. For iOS code signing, we use `fastlane match` which stores encrypted certificates and provisioning profiles in a private Git repository with AWS KMS. On every pull request, CI runs unit and snapshot tests. Upon merging to main, Fastlane automatically bumps build numbers, compiles signed IPA/AAB binaries, and pushes directly to TestFlight and Google Play Internal Testing tracks with automated changelogs.",
    "idealAnswer": "I manage mobile deployment via Fastlane scripts integrated into GitHub Actions. For iOS code signing, we use `fastlane match` which stores encrypted certificates and provisioning profiles in a private Git repository with AWS KMS. On every pull request, CI runs unit and snapshot tests. Upon merging to main, Fastlane automatically bumps build numbers, compiles signed IPA/AAB binaries, and pushes directly to TestFlight and Google Play Internal Testing tracks with automated changelogs.",
    "keyConceptsToCover": [
      "Fastlane Match",
      "Code Signing Certificates",
      "TestFlight CI/CD",
      "Automated Play Console Tracks"
    ],
    "followUps": [
      "How does Fastlane Match eliminate code signing conflicts across a distributed engineering team?",
      "What is the difference between Android App Bundles (AAB) and APKs for user download size?"
    ]
  },
  {
    "id": "mobile-app-developer-custom-jd-yqosg",
    "role": "Mobile App Developer",
    "category": "custom-jd",
    "difficulty": "hard",
    "question": "How do you profile and optimize mobile battery consumption, background location telemetry, and thermal throttling in location-heavy apps?",
    "hint": "Geofencing vs continuous GPS, Significant Motion API, fused location provider, batching network requests, Energy Organizer in Xcode Instruments.",
    "sampleAnswer": "Continuous GPS radio polling is the fastest way to drain mobile battery and cause thermal throttling. I optimize location tracking by replacing continuous GPS with Geofencing APIs and Android's Fused Location Provider in balanced-power mode. When high accuracy is required (during active navigation), we use the Significant Motion API and accelerometer sensors to suspend GPS when the device is stationary. Location telemetry points are buffered locally and batched into single compressed HTTP requests.",
    "idealAnswer": "Continuous GPS radio polling is the fastest way to drain mobile battery and cause thermal throttling. I optimize location tracking by replacing continuous GPS with Geofencing APIs and Android's Fused Location Provider in balanced-power mode. When high accuracy is required (during active navigation), we use the Significant Motion API and accelerometer sensors to suspend GPS when the device is stationary. Location telemetry points are buffered locally and batched into single compressed HTTP requests.",
    "keyConceptsToCover": [
      "Battery Optimization",
      "Fused Location Provider",
      "Significant Motion API",
      "Thermal Throttling",
      "Xcode Energy Profiler"
    ],
    "followUps": [
      "How does Android Doze mode and App Standby Buckets affect background location tracking?",
      "How do you detect when iOS suspends background execution using background task expiration handlers?"
    ]
  },
  {
    "id": "mobile-app-developer-core-technical-5d9vu",
    "role": "Mobile App Developer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How does Deep Linking work on mobile (Universal Links on iOS and App Links on Android) and how do you handle deferred deep linking for user onboarding?",
    "hint": "apple-app-site-association (AASA) file, assetlinks.json on HTTPS domain, deferred deep linking via fingerprinting or clipboard attribution.",
    "sampleAnswer": "Standard custom schemes (myapp://) are insecure and prompt warning dialogs. Universal Links (iOS) and App Links (Android) use two-way cryptographic verification: the mobile app declares the target domain, and the domain hosts a verified JSON file (`apple-app-site-association` and `assetlinks.json`). When a user taps a link, the OS opens the app directly without browser redirection. For users who don't have the app installed, Deferred Deep Linking uses Branch.io or device fingerprinting to route them to the App Store and restore context after installation.",
    "idealAnswer": "Standard custom schemes (myapp://) are insecure and prompt warning dialogs. Universal Links (iOS) and App Links (Android) use two-way cryptographic verification: the mobile app declares the target domain, and the domain hosts a verified JSON file (`apple-app-site-association` and `assetlinks.json`). When a user taps a link, the OS opens the app directly without browser redirection. For users who don't have the app installed, Deferred Deep Linking uses Branch.io or device fingerprinting to route them to the App Store and restore context after installation.",
    "keyConceptsToCover": [
      "Universal Links (iOS)",
      "App Links (Android)",
      "AASA Verification",
      "Deferred Deep Linking"
    ],
    "followUps": [
      "What causes Universal Links to silently break and fallback to Safari?",
      "How does deferred deep linking preserve the user's intended destination post-install?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-system-design-ag8jh",
    "role": "Cybersecurity & Systems Engineer",
    "category": "system-design",
    "difficulty": "hard",
    "question": "Design an enterprise Zero-Trust Network Access (ZTNA) and identity-aware proxy architecture replacing legacy corporate VPNs.",
    "hint": "BeyondCorp model, identity provider (IdP) OIDC/SAML, device posture evaluation (MDM/EDR), mTLS micro-segmentation, continuous authorization.",
    "sampleAnswer": "I architect the ZTNA solution around Google's BeyondCorp model. Corporate applications are never exposed directly to the public internet or flat local subnets; they sit behind an Identity-Aware Proxy (IAP/Envoy). Every incoming request requires: 1) Strong user authentication via IdP with FIDO2 WebAuthn MFA. 2) Device health attestation: the device must present a client certificate issued by corporate MDM verifying disk encryption and active EDR. 3) Continuous authorization: if device posture degrades during a session, access is revoked immediately.",
    "idealAnswer": "I architect the ZTNA solution around Google's BeyondCorp model. Corporate applications are never exposed directly to the public internet or flat local subnets; they sit behind an Identity-Aware Proxy (IAP/Envoy). Every incoming request requires: 1) Strong user authentication via IdP with FIDO2 WebAuthn MFA. 2) Device health attestation: the device must present a client certificate issued by corporate MDM verifying disk encryption and active EDR. 3) Continuous authorization: if device posture degrades during a session, access is revoked immediately.",
    "keyConceptsToCover": [
      "Zero Trust Network Access (ZTNA)",
      "Identity-Aware Proxy",
      "Device Posture Attestation",
      "mTLS Micro-segmentation",
      "FIDO2 WebAuthn"
    ],
    "followUps": [
      "How does ZTNA mitigate lateral movement compared to traditional corporate VPNs?",
      "How do you handle legacy internal protocols (e.g. SSH, RDP) through an identity-aware HTTP proxy?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-core-technical-13utx",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "Explain how Cross-Site Request Forgery (CSRF) and Cross-Site Scripting (XSS) attacks work, and how modern browser defenses (SameSite cookies, CSP, Subresource Integrity) mitigate them.",
    "hint": "Reflected/Stored/DOM XSS, CSRF state mutation via ambient credential transport, SameSite=Strict/Lax, Content-Security-Policy headers.",
    "sampleAnswer": "XSS occurs when malicious JavaScript executes in the victim's browser context (Stored, Reflected, or DOM-based), allowing attackers to steal session tokens or manipulate DOM. CSRF tricks an authenticated browser into submitting unauthorized requests to a trusted site because cookies are automatically sent with ambient credentials. Modern defenses include: 1) Cookies with `SameSite=Lax` or `Strict` and `HttpOnly; Secure`. 2) Strict `Content-Security-Policy` (CSP) with nonces to block unapproved script execution. 3) Subresource Integrity (SRI) hashes on CDN scripts.",
    "idealAnswer": "XSS occurs when malicious JavaScript executes in the victim's browser context (Stored, Reflected, or DOM-based), allowing attackers to steal session tokens or manipulate DOM. CSRF tricks an authenticated browser into submitting unauthorized requests to a trusted site because cookies are automatically sent with ambient credentials. Modern defenses include: 1) Cookies with `SameSite=Lax` or `Strict` and `HttpOnly; Secure`. 2) Strict `Content-Security-Policy` (CSP) with nonces to block unapproved script execution. 3) Subresource Integrity (SRI) hashes on CDN scripts.",
    "keyConceptsToCover": [
      "XSS (Stored/Reflected/DOM)",
      "CSRF Mitigation",
      "SameSite Cookie Attribute",
      "Content-Security-Policy (CSP)",
      "Subresource Integrity (SRI)"
    ],
    "followUps": [
      "Why does `SameSite=Lax` still allow top-level GET navigation requests, and why should GET requests never mutate state?",
      "How does an attacker bypass naive CSP configurations using JSONP endpoints?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-debugging-r7tuy",
    "role": "Cybersecurity & Systems Engineer",
    "category": "debugging",
    "difficulty": "hard",
    "question": "Your SIEM alerts that an AWS IAM role associated with an EC2 instance is suddenly executing unauthorized `s3:GetObject` calls across sensitive customer buckets. Triage and contain.",
    "hint": "SSRF vulnerability in web app querying EC2 IMDS (169.254.169.254) to steal temporary STS credentials. Immediate IAM revocation, upgrade to IMDSv2.",
    "sampleAnswer": "This alert indicates Server-Side Request Forgery (SSRF) where an attacker exploited a file-read or proxy endpoint to query the EC2 Instance Metadata Service (IMDS) at `http://169.254.169.254/latest/meta-data/iam/security-credentials/` and exfiltrate temporary AWS STS tokens. Immediate containment: 1) Revoke the compromised IAM session in AWS IAM console by attaching an inline deny policy for sessions issued before current timestamp. 2) Enforce IMDSv2 (requiring a PUT session token) on all EC2 instances to neutralize SSRF. 3) Audit CloudTrail to determine all downloaded S3 objects.",
    "idealAnswer": "This alert indicates Server-Side Request Forgery (SSRF) where an attacker exploited a file-read or proxy endpoint to query the EC2 Instance Metadata Service (IMDS) at `http://169.254.169.254/latest/meta-data/iam/security-credentials/` and exfiltrate temporary AWS STS tokens. Immediate containment: 1) Revoke the compromised IAM session in AWS IAM console by attaching an inline deny policy for sessions issued before current timestamp. 2) Enforce IMDSv2 (requiring a PUT session token) on all EC2 instances to neutralize SSRF. 3) Audit CloudTrail to determine all downloaded S3 objects.",
    "keyConceptsToCover": [
      "SSRF Attack",
      "EC2 IMDSv1 vs IMDSv2",
      "AWS STS Token Revocation",
      "CloudTrail Forensics"
    ],
    "followUps": [
      "Why does IMDSv2 require an HTTP PUT request with a TTL header to prevent SSRF bypasses?",
      "How do you detect lateral movement in an AWS account after IAM credential theft?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-dsa-yndjk",
    "role": "Cybersecurity & Systems Engineer",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Implement an automated IP CIDR block prefix match (Radix Tree / Trie) to filter blacklisted IP addresses at 100,000 packets per second.",
    "hint": "Bitwise binary trie (32 levels for IPv4, 128 for IPv6), longest prefix matching, O(32) lookup.",
    "sampleAnswer": "Standard hash maps cannot perform CIDR range queries efficiently. I implement a Binary Radix Trie where each bit of an IPv4 address (converted to a 32-bit integer) represents a tree branch (0 = left, 1 = right). A CIDR block `/24` creates a path of 24 nodes, marking the 24th node as a terminal blacklist entry. When a packet IP arrives, we traverse the trie bit-by-bit in maximum 32 steps (O(1)). If any terminal node is traversed, the packet matches the CIDR blacklist and is dropped.",
    "idealAnswer": "Standard hash maps cannot perform CIDR range queries efficiently. I implement a Binary Radix Trie where each bit of an IPv4 address (converted to a 32-bit integer) represents a tree branch (0 = left, 1 = right). A CIDR block `/24` creates a path of 24 nodes, marking the 24th node as a terminal blacklist entry. When a packet IP arrives, we traverse the trie bit-by-bit in maximum 32 steps (O(1)). If any terminal node is traversed, the packet matches the CIDR blacklist and is dropped.",
    "keyConceptsToCover": [
      "Binary Radix Trie",
      "Longest Prefix Match",
      "IP CIDR Filtering",
      "Bitwise Routing Table"
    ],
    "followUps": [
      "How do you extend this Radix Tree to support IPv6 (128-bit addresses) without excessive memory consumption?",
      "What is the memory footprint difference between a standard Trie vs a Compressed Patricia Tree?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-behavioral-dg3gh",
    "role": "Cybersecurity & Systems Engineer",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Describe a security vulnerability you discovered during a threat modeling or architecture review that prevented a critical breach before deployment.",
    "hint": "STAR format: STRIDE threat modeling, discovered broken object-level authorization (BOLA / IDOR), educated development team, and added automated authorization middleware.",
    "sampleAnswer": "During an architecture review for a new tenant billing portal, I conducted a STRIDE threat model on the invoice export endpoint `/api/invoices/{invoiceId}`. I discovered that while authentication was enforced, the service lacked object-level tenant validation (IDOR/BOLA), allowing an authenticated tenant to view competitor invoices by enumerating integer IDs. I raised this as a P1 security blocker, designed a tenant-scoped UUID lookup policy with automated authorization middleware, and added regression integration tests to CI.",
    "idealAnswer": "During an architecture review for a new tenant billing portal, I conducted a STRIDE threat model on the invoice export endpoint `/api/invoices/{invoiceId}`. I discovered that while authentication was enforced, the service lacked object-level tenant validation (IDOR/BOLA), allowing an authenticated tenant to view competitor invoices by enumerating integer IDs. I raised this as a P1 security blocker, designed a tenant-scoped UUID lookup policy with automated authorization middleware, and added regression integration tests to CI.",
    "keyConceptsToCover": [
      "STRIDE Threat Modeling",
      "IDOR / BOLA Prevention",
      "Object-Level Authorization",
      "Security by Design"
    ],
    "followUps": [
      "How do you prioritize fixing security vulnerabilities when developers are under tight feature deadlines?",
      "What is the difference between Authentication (AuthN) and Authorization (AuthZ) failures in production APIs?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-culture-4z77u",
    "role": "Cybersecurity & Systems Engineer",
    "category": "culture",
    "difficulty": "medium",
    "question": "How do you implement Shift-Left Security in DevSecOps pipelines (SAST, DAST, SCA, container scanning) without frustrating developer velocity?",
    "hint": "Static Application Security Testing (SAST), Software Composition Analysis (SCA for CVEs), gating only high/critical vulnerabilities, providing instant inline remediation guidance.",
    "sampleAnswer": "Shift-Left Security means embedding automated security checks directly into the developer workflow. We integrate Snyk/Trivy for Software Composition Analysis (SCA) to catch known CVEs in npm/pip dependencies and Semgrep for Static Analysis (SAST) in GitHub pull requests. To avoid developer friction, we configure CI to only break builds on verified High and Critical vulnerabilities with available fixes. Furthermore, security PR bots post exact remediation code snippets directly into the PR review.",
    "idealAnswer": "Shift-Left Security means embedding automated security checks directly into the developer workflow. We integrate Snyk/Trivy for Software Composition Analysis (SCA) to catch known CVEs in npm/pip dependencies and Semgrep for Static Analysis (SAST) in GitHub pull requests. To avoid developer friction, we configure CI to only break builds on verified High and Critical vulnerabilities with available fixes. Furthermore, security PR bots post exact remediation code snippets directly into the PR review.",
    "keyConceptsToCover": [
      "DevSecOps",
      "SAST (Semgrep)",
      "SCA (Snyk/Trivy)",
      "CVE Vulnerability Management",
      "Developer Velocity"
    ],
    "followUps": [
      "What are the limitations of Static Analysis (SAST) compared to Dynamic Analysis (DAST)?",
      "How do you manage false positives in automated security scanning tools?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-custom-jd-j1r0r",
    "role": "Cybersecurity & Systems Engineer",
    "category": "custom-jd",
    "difficulty": "hard",
    "question": "How do you design a secure cryptographic key management hierarchy using AWS KMS or HashiCorp Vault with envelope encryption?",
    "hint": "Master Key (CMK / KEK) in HSM, Data Encryption Key (DEK) generated locally for payload encryption, encrypting DEK with master key, zero plaintext DEK storage.",
    "sampleAnswer": "I implement Envelope Encryption. Storing all sensitive data directly in an HSM is prohibitively slow and expensive. Instead, an HSM-backed Key Encryption Key (KEK / Master Key) never leaves the secure boundary. When encrypting a database column or file, we call `KMS:GenerateDataKey` which returns a plaintext Data Encryption Key (DEK) and an encrypted DEK. The application encrypts the data locally with the plaintext DEK using AES-256-GCM, immediately wipes the plaintext DEK from memory, and stores the encrypted DEK alongside the ciphertext.",
    "idealAnswer": "I implement Envelope Encryption. Storing all sensitive data directly in an HSM is prohibitively slow and expensive. Instead, an HSM-backed Key Encryption Key (KEK / Master Key) never leaves the secure boundary. When encrypting a database column or file, we call `KMS:GenerateDataKey` which returns a plaintext Data Encryption Key (DEK) and an encrypted DEK. The application encrypts the data locally with the plaintext DEK using AES-256-GCM, immediately wipes the plaintext DEK from memory, and stores the encrypted DEK alongside the ciphertext.",
    "keyConceptsToCover": [
      "Envelope Encryption",
      "Key Encryption Key (KEK)",
      "Data Encryption Key (DEK)",
      "AES-256-GCM",
      "Hardware Security Module (HSM)"
    ],
    "followUps": [
      "Why does Envelope Encryption minimize KMS API rate limits and network latency?",
      "How do you automate cryptographic key rotation without re-encrypting terabytes of existing database records?"
    ]
  },
  {
    "id": "cybersecurity-systems-engineer-core-technical-bsmch",
    "role": "Cybersecurity & Systems Engineer",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "How do Buffer Overflow vulnerabilities work on x86-64 Linux, and how do modern compiler/OS protections (ASLR, Stack Canaries, NX/DEP) prevent code execution?",
    "hint": "Overwriting return pointer on stack, shellcode injection, Stack Canaries (magic values), ASLR randomizing memory offsets, NX marking stack non-executable.",
    "sampleAnswer": "A buffer overflow occurs when an application writes more data to a stack-allocated buffer than allocated (e.g. via strcpy), overwriting adjacent stack memory including the stored Base Pointer and Return Instruction Pointer (RIP). When the function returns, execution jumps to attacker-controlled memory. Modern protections include: 1) Stack Canaries: randomized integers placed before RIP that are validated before return. 2) NX/DEP: marks stack memory non-executable, preventing shellcode execution. 3) ASLR: randomizes stack, heap, and library base addresses, thwarting hardcoded jump targets.",
    "idealAnswer": "A buffer overflow occurs when an application writes more data to a stack-allocated buffer than allocated (e.g. via strcpy), overwriting adjacent stack memory including the stored Base Pointer and Return Instruction Pointer (RIP). When the function returns, execution jumps to attacker-controlled memory. Modern protections include: 1) Stack Canaries: randomized integers placed before RIP that are validated before return. 2) NX/DEP: marks stack memory non-executable, preventing shellcode execution. 3) ASLR: randomizes stack, heap, and library base addresses, thwarting hardcoded jump targets.",
    "keyConceptsToCover": [
      "Buffer Overflow",
      "Stack Canaries",
      "ASLR (Address Space Layout Randomization)",
      "NX/DEP Bit",
      "Return-Oriented Programming (ROP)"
    ],
    "followUps": [
      "How do attackers bypass NX/DEP using Return-Oriented Programming (ROP) gadgets?",
      "What is the difference between a stack-based buffer overflow and a heap-based use-after-free vulnerability?"
    ]
  },
  {
    "id": "cloud-sre-core-technical-bqhy3",
    "role": "Cloud / SRE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "SRE Scenario 9: How do you design, monitor, and troubleshoot production Kubernetes cluster upgrades?",
    "hint": "Focus on resilience, etcd quorum backup, drain node eviction, pod disruption budgets (PDB), kubelet minor version skew.",
    "sampleAnswer": "When implementing Kubernetes cluster upgrades, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. etcd quorum backup, drain node eviction, pod disruption budgets (PDB), kubelet minor version skew.",
    "idealAnswer": "When implementing Kubernetes cluster upgrades, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. etcd quorum backup, drain node eviction, pod disruption budgets (PDB), kubelet minor version skew.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Kubernetes cluster upgrades"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-system-design-etant",
    "role": "Cloud / SRE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "SRE Scenario 10: How do you design, monitor, and troubleshoot production BGP network routing & Anycast?",
    "hint": "Focus on resilience, BGP peering, Anycast routing to closest edge POP, route flap damping, latency reduction.",
    "sampleAnswer": "When implementing BGP network routing & Anycast, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. BGP peering, Anycast routing to closest edge POP, route flap damping, latency reduction.",
    "idealAnswer": "When implementing BGP network routing & Anycast, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. BGP peering, Anycast routing to closest edge POP, route flap damping, latency reduction.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "BGP network routing & Anycast"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-debugging-lpf6r",
    "role": "Cloud / SRE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "SRE Scenario 11: How do you design, monitor, and troubleshoot production Distributed tracing propagation?",
    "hint": "Focus on resilience, W3C trace context, OpenTelemetry B3 headers, span baggage, context propagation across async boundaries.",
    "sampleAnswer": "When implementing Distributed tracing propagation, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. W3C trace context, OpenTelemetry B3 headers, span baggage, context propagation across async boundaries.",
    "idealAnswer": "When implementing Distributed tracing propagation, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. W3C trace context, OpenTelemetry B3 headers, span baggage, context propagation across async boundaries.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Distributed tracing propagation"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-dsa-omcho",
    "role": "Cloud / SRE",
    "category": "dsa",
    "difficulty": "hard",
    "question": "SRE Scenario 12: How do you design, monitor, and troubleshoot production Prometheus Thanos federation?",
    "hint": "Focus on resilience, Thanos Sidecar, Store Gateway, Compact, long-term S3 metric storage, global deduplicated querying.",
    "sampleAnswer": "When implementing Prometheus Thanos federation, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Thanos Sidecar, Store Gateway, Compact, long-term S3 metric storage, global deduplicated querying.",
    "idealAnswer": "When implementing Prometheus Thanos federation, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Thanos Sidecar, Store Gateway, Compact, long-term S3 metric storage, global deduplicated querying.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Prometheus Thanos federation"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-behavioral-sv5mr",
    "role": "Cloud / SRE",
    "category": "behavioral",
    "difficulty": "hard",
    "question": "SRE Scenario 13: How do you design, monitor, and troubleshoot production etcd quorum recovery?",
    "hint": "Focus on resilience, Raft consensus, split-brain prevention, snapshot restoration, member removal and re-addition.",
    "sampleAnswer": "When implementing etcd quorum recovery, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Raft consensus, split-brain prevention, snapshot restoration, member removal and re-addition.",
    "idealAnswer": "When implementing etcd quorum recovery, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Raft consensus, split-brain prevention, snapshot restoration, member removal and re-addition.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "etcd quorum recovery"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-culture-1hp4r",
    "role": "Cloud / SRE",
    "category": "culture",
    "difficulty": "hard",
    "question": "SRE Scenario 14: How do you design, monitor, and troubleshoot production Global DNS latency optimization?",
    "hint": "Focus on resilience, Route 53 latency-based routing, EDNS client subnet, TTL caching, health check failovers.",
    "sampleAnswer": "When implementing Global DNS latency optimization, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Route 53 latency-based routing, EDNS client subnet, TTL caching, health check failovers.",
    "idealAnswer": "When implementing Global DNS latency optimization, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Route 53 latency-based routing, EDNS client subnet, TTL caching, health check failovers.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Global DNS latency optimization"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-core-technical-5486v",
    "role": "Cloud / SRE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "SRE Scenario 15: How do you design, monitor, and troubleshoot production Terraform state locking & drift?",
    "hint": "Focus on resilience, DynamoDB state locking, automated plan verification, drift detection cron, state manipulation safety.",
    "sampleAnswer": "When implementing Terraform state locking & drift, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. DynamoDB state locking, automated plan verification, drift detection cron, state manipulation safety.",
    "idealAnswer": "When implementing Terraform state locking & drift, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. DynamoDB state locking, automated plan verification, drift detection cron, state manipulation safety.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Terraform state locking & drift"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-system-design-bi76c",
    "role": "Cloud / SRE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "SRE Scenario 16: How do you design, monitor, and troubleshoot production Linux kernel memory tuning?",
    "hint": "Focus on resilience, vm.swappiness, vm.overcommit_memory, hugepages, page cache dirty ratio tuning.",
    "sampleAnswer": "When implementing Linux kernel memory tuning, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. vm.swappiness, vm.overcommit_memory, hugepages, page cache dirty ratio tuning.",
    "idealAnswer": "When implementing Linux kernel memory tuning, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. vm.swappiness, vm.overcommit_memory, hugepages, page cache dirty ratio tuning.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Linux kernel memory tuning"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-debugging-t8agi",
    "role": "Cloud / SRE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "SRE Scenario 17: How do you design, monitor, and troubleshoot production PostgreSQL WAL archiving & replication?",
    "hint": "Focus on resilience, Write-Ahead Logging, streaming physical replication, logical decoding, point-in-time recovery (PITR).",
    "sampleAnswer": "When implementing PostgreSQL WAL archiving & replication, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Write-Ahead Logging, streaming physical replication, logical decoding, point-in-time recovery (PITR).",
    "idealAnswer": "When implementing PostgreSQL WAL archiving & replication, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Write-Ahead Logging, streaming physical replication, logical decoding, point-in-time recovery (PITR).",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "PostgreSQL WAL archiving & replication"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-dsa-r5dpj",
    "role": "Cloud / SRE",
    "category": "dsa",
    "difficulty": "hard",
    "question": "SRE Scenario 18: How do you design, monitor, and troubleshoot production Kafka broker disk & partition rebalancing?",
    "hint": "Focus on resilience, Partition rebalance tools, cruise control, replica lag, broker disk saturation remediation.",
    "sampleAnswer": "When implementing Kafka broker disk & partition rebalancing, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Partition rebalance tools, cruise control, replica lag, broker disk saturation remediation.",
    "idealAnswer": "When implementing Kafka broker disk & partition rebalancing, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Partition rebalance tools, cruise control, replica lag, broker disk saturation remediation.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Kafka broker disk & partition rebalancing"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-behavioral-4ft4l",
    "role": "Cloud / SRE",
    "category": "behavioral",
    "difficulty": "hard",
    "question": "SRE Scenario 19: How do you design, monitor, and troubleshoot production Service mesh mTLS enforcement?",
    "hint": "Focus on resilience, Istio PeerAuthentication STRICT mode, SPIFFE/SPIRE identity, mutual TLS handshake overhead.",
    "sampleAnswer": "When implementing Service mesh mTLS enforcement, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Istio PeerAuthentication STRICT mode, SPIFFE/SPIRE identity, mutual TLS handshake overhead.",
    "idealAnswer": "When implementing Service mesh mTLS enforcement, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Istio PeerAuthentication STRICT mode, SPIFFE/SPIRE identity, mutual TLS handshake overhead.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Service mesh mTLS enforcement"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-culture-gmj20",
    "role": "Cloud / SRE",
    "category": "culture",
    "difficulty": "hard",
    "question": "SRE Scenario 20: How do you design, monitor, and troubleshoot production AWS Direct Connect & Transit Gateway?",
    "hint": "Focus on resilience, Dedicated 10Gbps fiber interconnects, Transit Gateway route tables, IPsec VPN backup failover.",
    "sampleAnswer": "When implementing AWS Direct Connect & Transit Gateway, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Dedicated 10Gbps fiber interconnects, Transit Gateway route tables, IPsec VPN backup failover.",
    "idealAnswer": "When implementing AWS Direct Connect & Transit Gateway, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Dedicated 10Gbps fiber interconnects, Transit Gateway route tables, IPsec VPN backup failover.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "AWS Direct Connect & Transit Gateway"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-core-technical-5fh4z",
    "role": "Cloud / SRE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "SRE Scenario 21: How do you design, monitor, and troubleshoot production Container runtime security & Falco?",
    "hint": "Focus on resilience, eBPF kernel system call inspection, unauthorized shell spawning detection, automated pod isolation.",
    "sampleAnswer": "When implementing Container runtime security & Falco, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. eBPF kernel system call inspection, unauthorized shell spawning detection, automated pod isolation.",
    "idealAnswer": "When implementing Container runtime security & Falco, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. eBPF kernel system call inspection, unauthorized shell spawning detection, automated pod isolation.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Container runtime security & Falco"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-system-design-z3icu",
    "role": "Cloud / SRE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "SRE Scenario 22: How do you design, monitor, and troubleshoot production CDN edge caching & cache purges?",
    "hint": "Focus on resilience, Cloudflare / CloudFront surrogate keys, stale-while-revalidate, edge worker routing, instant purge API.",
    "sampleAnswer": "When implementing CDN edge caching & cache purges, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Cloudflare / CloudFront surrogate keys, stale-while-revalidate, edge worker routing, instant purge API.",
    "idealAnswer": "When implementing CDN edge caching & cache purges, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Cloudflare / CloudFront surrogate keys, stale-while-revalidate, edge worker routing, instant purge API.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "CDN edge caching & cache purges"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-debugging-godnb",
    "role": "Cloud / SRE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "SRE Scenario 23: How do you design, monitor, and troubleshoot production Database connection pool exhaustion?",
    "hint": "Focus on resilience, PgBouncer vs HikariCP, connection queueing, thread pool starvation, TCP keepalive tuning.",
    "sampleAnswer": "When implementing Database connection pool exhaustion, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. PgBouncer vs HikariCP, connection queueing, thread pool starvation, TCP keepalive tuning.",
    "idealAnswer": "When implementing Database connection pool exhaustion, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. PgBouncer vs HikariCP, connection queueing, thread pool starvation, TCP keepalive tuning.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Database connection pool exhaustion"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-dsa-kbh7g",
    "role": "Cloud / SRE",
    "category": "dsa",
    "difficulty": "hard",
    "question": "SRE Scenario 24: How do you design, monitor, and troubleshoot production Auto-scaling algorithms (KEDA)?",
    "hint": "Focus on resilience, Event-driven autoscaling, Kafka consumer lag metrics, AWS SQS queue depth scaling.",
    "sampleAnswer": "When implementing Auto-scaling algorithms (KEDA), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Event-driven autoscaling, Kafka consumer lag metrics, AWS SQS queue depth scaling.",
    "idealAnswer": "When implementing Auto-scaling algorithms (KEDA), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Event-driven autoscaling, Kafka consumer lag metrics, AWS SQS queue depth scaling.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Auto-scaling algorithms (KEDA)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-behavioral-t3qtj",
    "role": "Cloud / SRE",
    "category": "behavioral",
    "difficulty": "hard",
    "question": "SRE Scenario 25: How do you design, monitor, and troubleshoot production Linux network socket buffer tuning?",
    "hint": "Focus on resilience, SO_RCVBUF, SO_SNDBUF, net.ipv4.tcp_max_syn_backlog, epoll vs select file descriptor limits.",
    "sampleAnswer": "When implementing Linux network socket buffer tuning, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. SO_RCVBUF, SO_SNDBUF, net.ipv4.tcp_max_syn_backlog, epoll vs select file descriptor limits.",
    "idealAnswer": "When implementing Linux network socket buffer tuning, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. SO_RCVBUF, SO_SNDBUF, net.ipv4.tcp_max_syn_backlog, epoll vs select file descriptor limits.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Linux network socket buffer tuning"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-culture-fcqr7",
    "role": "Cloud / SRE",
    "category": "culture",
    "difficulty": "hard",
    "question": "SRE Scenario 26: How do you design, monitor, and troubleshoot production Zero-trust service identity (SPIFFE/SPIRE)?",
    "hint": "Focus on resilience, Cryptographic workload attestation, SVID X.509 certificates, short-lived automated rotation.",
    "sampleAnswer": "When implementing Zero-trust service identity (SPIFFE/SPIRE), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Cryptographic workload attestation, SVID X.509 certificates, short-lived automated rotation.",
    "idealAnswer": "When implementing Zero-trust service identity (SPIFFE/SPIRE), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Cryptographic workload attestation, SVID X.509 certificates, short-lived automated rotation.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Zero-trust service identity (SPIFFE/SPIRE)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-core-technical-uut2e",
    "role": "Cloud / SRE",
    "category": "core-technical",
    "difficulty": "hard",
    "question": "SRE Scenario 27: How do you design, monitor, and troubleshoot production Cloud cost optimization (FinOps)?",
    "hint": "Focus on resilience, AWS Savings Plans vs Reserved Instances, spot instance interruption handling, right-sizing via Kubecost.",
    "sampleAnswer": "When implementing Cloud cost optimization (FinOps), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. AWS Savings Plans vs Reserved Instances, spot instance interruption handling, right-sizing via Kubecost.",
    "idealAnswer": "When implementing Cloud cost optimization (FinOps), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. AWS Savings Plans vs Reserved Instances, spot instance interruption handling, right-sizing via Kubecost.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Cloud cost optimization (FinOps)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-system-design-5dtgm",
    "role": "Cloud / SRE",
    "category": "system-design",
    "difficulty": "hard",
    "question": "SRE Scenario 28: How do you design, monitor, and troubleshoot production Distributed deadlock detection?",
    "hint": "Focus on resilience, Lock dependency graphs, wait-for cycles, distributed transaction coordinators, timeout aborts.",
    "sampleAnswer": "When implementing Distributed deadlock detection, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Lock dependency graphs, wait-for cycles, distributed transaction coordinators, timeout aborts.",
    "idealAnswer": "When implementing Distributed deadlock detection, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Lock dependency graphs, wait-for cycles, distributed transaction coordinators, timeout aborts.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "Distributed deadlock detection"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-debugging-e62z4",
    "role": "Cloud / SRE",
    "category": "debugging",
    "difficulty": "hard",
    "question": "SRE Scenario 29: How do you design, monitor, and troubleshoot production High-throughput log ingest (Vector / Fluentbit)?",
    "hint": "Focus on resilience, Backpressure handling, memory buffers, disk spooling, structured JSON parsing.",
    "sampleAnswer": "When implementing High-throughput log ingest (Vector / Fluentbit), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Backpressure handling, memory buffers, disk spooling, structured JSON parsing.",
    "idealAnswer": "When implementing High-throughput log ingest (Vector / Fluentbit), I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Backpressure handling, memory buffers, disk spooling, structured JSON parsing.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "High-throughput log ingest (Vector / Fluentbit)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "cloud-sre-dsa-plr7q",
    "role": "Cloud / SRE",
    "category": "dsa",
    "difficulty": "hard",
    "question": "SRE Scenario 30: How do you design, monitor, and troubleshoot production API Gateway Envoy filter chaining?",
    "hint": "Focus on resilience, Envoy WASM filters, Lua scripting, rate limiting sidecars, JWT verification filter chains.",
    "sampleAnswer": "When implementing API Gateway Envoy filter chaining, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Envoy WASM filters, Lua scripting, rate limiting sidecars, JWT verification filter chains.",
    "idealAnswer": "When implementing API Gateway Envoy filter chaining, I prioritize automated verification and blast radius containment. We establish clear SLIs/SLOs in Prometheus, configure automated canary rollouts, and ensure comprehensive runbooks with automated self-healing scripts. Envoy WASM filters, Lua scripting, rate limiting sidecars, JWT verification filter chains.",
    "keyConceptsToCover": [
      "Site Reliability Engineering",
      "Fault Isolation",
      "Automated Mitigation",
      "API Gateway Envoy filter chaining"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-core-technical-jvm1p",
    "role": "Data Analyst",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Analytics Case Study 9: How do you analyze, model, and present findings on Customer Lifetime Value (LTV)?",
    "hint": "Focus on methodology: Cohort-based LTV modeling, churn discounting, payback period, CAC to LTV ratios.",
    "sampleAnswer": "I approach Customer Lifetime Value (LTV) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Cohort-based LTV modeling, churn discounting, payback period, CAC to LTV ratios. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Customer Lifetime Value (LTV) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Cohort-based LTV modeling, churn discounting, payback period, CAC to LTV ratios. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Customer Lifetime Value (LTV)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-system-design-xuf5r",
    "role": "Data Analyst",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Analytics Case Study 10: How do you analyze, model, and present findings on Churn Prediction Cohorts?",
    "hint": "Focus on methodology: Survival analysis, Kaplan-Meier curves, hazard ratios, early warning feature signals.",
    "sampleAnswer": "I approach Churn Prediction Cohorts with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Survival analysis, Kaplan-Meier curves, hazard ratios, early warning feature signals. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Churn Prediction Cohorts with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Survival analysis, Kaplan-Meier curves, hazard ratios, early warning feature signals. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Churn Prediction Cohorts"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-debugging-mvi5w",
    "role": "Data Analyst",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Analytics Case Study 11: How do you analyze, model, and present findings on Pricing Elasticity & Sensitivity?",
    "hint": "Focus on methodology: Van Westendorp Price Sensitivity Meter, price elasticity of demand curves, A/B price testing.",
    "sampleAnswer": "I approach Pricing Elasticity & Sensitivity with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Van Westendorp Price Sensitivity Meter, price elasticity of demand curves, A/B price testing. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Pricing Elasticity & Sensitivity with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Van Westendorp Price Sensitivity Meter, price elasticity of demand curves, A/B price testing. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Pricing Elasticity & Sensitivity"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-dsa-ct468",
    "role": "Data Analyst",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Analytics Case Study 12: How do you analyze, model, and present findings on Marketing Attribution Multi-Touch?",
    "hint": "Focus on methodology: First-touch vs Last-touch vs Markov Chain data-driven attribution models across campaign channels.",
    "sampleAnswer": "I approach Marketing Attribution Multi-Touch with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. First-touch vs Last-touch vs Markov Chain data-driven attribution models across campaign channels. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Marketing Attribution Multi-Touch with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. First-touch vs Last-touch vs Markov Chain data-driven attribution models across campaign channels. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Marketing Attribution Multi-Touch"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-behavioral-y5vac",
    "role": "Data Analyst",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Analytics Case Study 13: How do you analyze, model, and present findings on Warehouse Query Cost Optimization?",
    "hint": "Focus on methodology: Snowflake warehouse clustering keys, partition pruning in BigQuery, materializing repeated joins.",
    "sampleAnswer": "I approach Warehouse Query Cost Optimization with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Snowflake warehouse clustering keys, partition pruning in BigQuery, materializing repeated joins. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Warehouse Query Cost Optimization with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Snowflake warehouse clustering keys, partition pruning in BigQuery, materializing repeated joins. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Warehouse Query Cost Optimization"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-culture-8pgsp",
    "role": "Data Analyst",
    "category": "culture",
    "difficulty": "medium",
    "question": "Analytics Case Study 14: How do you analyze, model, and present findings on Product Feature Engagement Funnels?",
    "hint": "Focus on methodology: Multi-step dropoff analysis, time-to-value (TTV), reverse funnel pathing, session replay correlation.",
    "sampleAnswer": "I approach Product Feature Engagement Funnels with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Multi-step dropoff analysis, time-to-value (TTV), reverse funnel pathing, session replay correlation. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Product Feature Engagement Funnels with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Multi-step dropoff analysis, time-to-value (TTV), reverse funnel pathing, session replay correlation. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Product Feature Engagement Funnels"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-core-technical-84dok",
    "role": "Data Analyst",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Analytics Case Study 15: How do you analyze, model, and present findings on Executive KPI Dashboard Storytelling?",
    "hint": "Focus on methodology: Top-level KPI gauges, drilldown hierarchy, context benchmarks, actionable insight callouts.",
    "sampleAnswer": "I approach Executive KPI Dashboard Storytelling with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Top-level KPI gauges, drilldown hierarchy, context benchmarks, actionable insight callouts. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Executive KPI Dashboard Storytelling with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Top-level KPI gauges, drilldown hierarchy, context benchmarks, actionable insight callouts. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Executive KPI Dashboard Storytelling"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-system-design-bk0y6",
    "role": "Data Analyst",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Analytics Case Study 16: How do you analyze, model, and present findings on Market Basket & Association Rules?",
    "hint": "Focus on methodology: Apriori algorithm, Support, Confidence, Lift, cross-sell recommendation engines.",
    "sampleAnswer": "I approach Market Basket & Association Rules with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Apriori algorithm, Support, Confidence, Lift, cross-sell recommendation engines. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Market Basket & Association Rules with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Apriori algorithm, Support, Confidence, Lift, cross-sell recommendation engines. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Market Basket & Association Rules"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-debugging-jxc9c",
    "role": "Data Analyst",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Analytics Case Study 17: How do you analyze, model, and present findings on Time Series Seasonality Forecasting?",
    "hint": "Focus on methodology: Prophet / ARIMA models, trend decomposition, holiday regressors, confidence intervals.",
    "sampleAnswer": "I approach Time Series Seasonality Forecasting with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Prophet / ARIMA models, trend decomposition, holiday regressors, confidence intervals. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Time Series Seasonality Forecasting with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Prophet / ARIMA models, trend decomposition, holiday regressors, confidence intervals. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Time Series Seasonality Forecasting"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-dsa-wvji9",
    "role": "Data Analyst",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Analytics Case Study 18: How do you analyze, model, and present findings on Customer Segmentation (RFM)?",
    "hint": "Focus on methodology: Recency, Frequency, Monetary scoring, k-means cluster validation, targeted persona tiers.",
    "sampleAnswer": "I approach Customer Segmentation (RFM) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Recency, Frequency, Monetary scoring, k-means cluster validation, targeted persona tiers. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Customer Segmentation (RFM) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Recency, Frequency, Monetary scoring, k-means cluster validation, targeted persona tiers. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Customer Segmentation (RFM)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-behavioral-68mu7",
    "role": "Data Analyst",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Analytics Case Study 19: How do you analyze, model, and present findings on Data Quality & Anomaly Assertions?",
    "hint": "Focus on methodology: dbt-expectations, Great Expectations suites, automated null and range drift detection.",
    "sampleAnswer": "I approach Data Quality & Anomaly Assertions with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. dbt-expectations, Great Expectations suites, automated null and range drift detection. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Data Quality & Anomaly Assertions with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. dbt-expectations, Great Expectations suites, automated null and range drift detection. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Data Quality & Anomaly Assertions"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-culture-0ui3q",
    "role": "Data Analyst",
    "category": "culture",
    "difficulty": "medium",
    "question": "Analytics Case Study 20: How do you analyze, model, and present findings on Sales Pipeline Velocity & Conversion?",
    "hint": "Focus on methodology: Stage duration metrics, win rates by deal size, rep quota attainment distributions.",
    "sampleAnswer": "I approach Sales Pipeline Velocity & Conversion with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Stage duration metrics, win rates by deal size, rep quota attainment distributions. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Sales Pipeline Velocity & Conversion with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Stage duration metrics, win rates by deal size, rep quota attainment distributions. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Sales Pipeline Velocity & Conversion"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-core-technical-9xcr8",
    "role": "Data Analyst",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Analytics Case Study 21: How do you analyze, model, and present findings on SaaS Net Revenue Retention (NRR)?",
    "hint": "Focus on methodology: Expansion revenue, contraction, gross churn, cohort heatmaps, benchmark metrics.",
    "sampleAnswer": "I approach SaaS Net Revenue Retention (NRR) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Expansion revenue, contraction, gross churn, cohort heatmaps, benchmark metrics. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach SaaS Net Revenue Retention (NRR) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Expansion revenue, contraction, gross churn, cohort heatmaps, benchmark metrics. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "SaaS Net Revenue Retention (NRR)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-system-design-1zerf",
    "role": "Data Analyst",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Analytics Case Study 22: How do you analyze, model, and present findings on User Survey Sentiment Analysis (NPS)?",
    "hint": "Focus on methodology: Net Promoter Score calculation, CSAT, NLP text topic modeling on customer feedback comments.",
    "sampleAnswer": "I approach User Survey Sentiment Analysis (NPS) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Net Promoter Score calculation, CSAT, NLP text topic modeling on customer feedback comments. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach User Survey Sentiment Analysis (NPS) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Net Promoter Score calculation, CSAT, NLP text topic modeling on customer feedback comments. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "User Survey Sentiment Analysis (NPS)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-debugging-558q9",
    "role": "Data Analyst",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Analytics Case Study 23: How do you analyze, model, and present findings on Omnichannel Retail Inventory Turnover?",
    "hint": "Focus on methodology: Sell-through rate, inventory holding costs, stockout probability, lead time variance.",
    "sampleAnswer": "I approach Omnichannel Retail Inventory Turnover with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Sell-through rate, inventory holding costs, stockout probability, lead time variance. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Omnichannel Retail Inventory Turnover with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Sell-through rate, inventory holding costs, stockout probability, lead time variance. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Omnichannel Retail Inventory Turnover"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-dsa-el33l",
    "role": "Data Analyst",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Analytics Case Study 24: How do you analyze, model, and present findings on A/B Test Peeking & Sequential Testing?",
    "hint": "Focus on methodology: Alpha spending functions, sequential probability ratio tests (SPRT), preventing sample ratio mismatch.",
    "sampleAnswer": "I approach A/B Test Peeking & Sequential Testing with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Alpha spending functions, sequential probability ratio tests (SPRT), preventing sample ratio mismatch. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach A/B Test Peeking & Sequential Testing with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Alpha spending functions, sequential probability ratio tests (SPRT), preventing sample ratio mismatch. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "A/B Test Peeking & Sequential Testing"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-behavioral-i59e8",
    "role": "Data Analyst",
    "category": "behavioral",
    "difficulty": "medium",
    "question": "Analytics Case Study 25: How do you analyze, model, and present findings on Web Analytics Session Stitching?",
    "hint": "Focus on methodology: Cross-device user ID reconciliation, anonymous-to-authenticated tracking, cookie consent handling.",
    "sampleAnswer": "I approach Web Analytics Session Stitching with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Cross-device user ID reconciliation, anonymous-to-authenticated tracking, cookie consent handling. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Web Analytics Session Stitching with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Cross-device user ID reconciliation, anonymous-to-authenticated tracking, cookie consent handling. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Web Analytics Session Stitching"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-culture-9ep00",
    "role": "Data Analyst",
    "category": "culture",
    "difficulty": "medium",
    "question": "Analytics Case Study 26: How do you analyze, model, and present findings on Data Mesh Domain Ownership?",
    "hint": "Focus on methodology: Decentralized data products, domain-driven data modeling, federated computational governance.",
    "sampleAnswer": "I approach Data Mesh Domain Ownership with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Decentralized data products, domain-driven data modeling, federated computational governance. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Data Mesh Domain Ownership with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Decentralized data products, domain-driven data modeling, federated computational governance. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Data Mesh Domain Ownership"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-core-technical-odplg",
    "role": "Data Analyst",
    "category": "core-technical",
    "difficulty": "medium",
    "question": "Analytics Case Study 27: How do you analyze, model, and present findings on Product Usage Stickiness (DAU/MAU)?",
    "hint": "Focus on methodology: L14/L28 engagement curves, power user curves, core action frequency analysis.",
    "sampleAnswer": "I approach Product Usage Stickiness (DAU/MAU) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. L14/L28 engagement curves, power user curves, core action frequency analysis. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Product Usage Stickiness (DAU/MAU) with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. L14/L28 engagement curves, power user curves, core action frequency analysis. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Product Usage Stickiness (DAU/MAU)"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-system-design-3vs3w",
    "role": "Data Analyst",
    "category": "system-design",
    "difficulty": "medium",
    "question": "Analytics Case Study 28: How do you analyze, model, and present findings on Supply Chain Demand Volatility?",
    "hint": "Focus on methodology: Bullwhip effect analysis, safety stock calculations, supplier delivery reliability scoring.",
    "sampleAnswer": "I approach Supply Chain Demand Volatility with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Bullwhip effect analysis, safety stock calculations, supplier delivery reliability scoring. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Supply Chain Demand Volatility with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. Bullwhip effect analysis, safety stock calculations, supplier delivery reliability scoring. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Supply Chain Demand Volatility"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-debugging-nalbl",
    "role": "Data Analyst",
    "category": "debugging",
    "difficulty": "medium",
    "question": "Analytics Case Study 29: How do you analyze, model, and present findings on Healthcare / Fintech Regulatory Audits?",
    "hint": "Focus on methodology: HIPAA/SOC2 compliance reporting, audit trail completeness, sensitive PII tokenization.",
    "sampleAnswer": "I approach Healthcare / Fintech Regulatory Audits with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. HIPAA/SOC2 compliance reporting, audit trail completeness, sensitive PII tokenization. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Healthcare / Fintech Regulatory Audits with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. HIPAA/SOC2 compliance reporting, audit trail completeness, sensitive PII tokenization. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Healthcare / Fintech Regulatory Audits"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  },
  {
    "id": "data-analyst-dsa-zo09b",
    "role": "Data Analyst",
    "category": "dsa",
    "difficulty": "medium",
    "question": "Analytics Case Study 30: How do you analyze, model, and present findings on Executive Board Deck Data Synthesis?",
    "hint": "Focus on methodology: C-suite executive summaries, translating statistical variances into revenue drivers, strategic recommendations.",
    "sampleAnswer": "I approach Executive Board Deck Data Synthesis with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. C-suite executive summaries, translating statistical variances into revenue drivers, strategic recommendations. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "idealAnswer": "I approach Executive Board Deck Data Synthesis with a rigorous analytical workflow: validating source data lineage, modeling reproducible transformation pipelines in dbt/SQL, and applying statistical rigor. C-suite executive summaries, translating statistical variances into revenue drivers, strategic recommendations. I synthesize findings into clear executive narratives with actionable business recommendations.",
    "keyConceptsToCover": [
      "Data Analysis",
      "Statistical Modeling",
      "Business Intelligence",
      "Executive Board Deck Data Synthesis"
    ],
    "followUps": [
      "How would you benchmark this in production?",
      "What trade-offs did you consider?"
    ]
  }
];

export function getRoleInterviewQuestions(
  role: string = "Full-Stack SDE",
  category: "all" | InterviewCategory = "all",
  difficulty?: "easy" | "medium" | "hard"
): InterviewQuestion[] {
  return CURATED_INTERVIEW_QUESTIONS.filter((q) => {
    // Role filter: if question has specific role, match it; otherwise match general
    const roleMatches = !q.role || q.role.toLowerCase() === role.toLowerCase();
    
    // Category filter
    const catMatches = category === "all" || q.category === category;

    // Difficulty filter
    const diffMatches = !difficulty || q.difficulty === difficulty;

    return roleMatches && catMatches && diffMatches;
  });
}
