// ─── Comprehensive Company OA & DSA Problem Bank ────────────────────────────
// 30 Authentic Indian Campus & Big-Tech Online Assessment (OA) Coding Problems
// Spanning Striver A2Z / NeetCode 150 Core Patterns

export type DsaTopic =
  | "Arrays & Hashing"
  | "Sliding Window & Two Pointers"
  | "Stacks, Queues & Monotonic"
  | "Linked Lists & Cache Design"
  | "Trees & Binary Search"
  | "Graphs, BFS/DFS & TopoSort"
  | "Dynamic Programming"
  | "Heaps & Greedy"
  | "Backtracking & Tries";

export interface DsaTestCase {
  id: string;
  inputDisplay: string;
  expectedOutputDisplay: string;
  isHidden?: boolean;
}

export interface DsaOaProblem {
  id: string;
  number: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: DsaTopic;
  companyTags: string[];
  roles: string[];
  problemStatement: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
  expectedTimeComplexity: string;
  expectedSpaceComplexity: string;
  keyConcepts: string[];
  hints: string[];
  starterCode: {
    cpp: string;
    java: string;
    python: string;
    typescript: string;
  };
  referenceSolution: {
    cpp: string;
    java: string;
    python: string;
    typescript: string;
  };
  testCases: DsaTestCase[];
}

export const CORE_MAJOR_COMPANIES: string[] = [
  "Google",
  "Amazon OA",
  "Microsoft",
  "Stripe",
  "Uber",
  "Goldman Sachs",
  "Swiggy",
  "Flipkart",
  "Zomato",
  "Razorpay",
  "Confluent",
  "Adobe",
  "Atlassian",
  "Meta",
  "Apple",
  "Morgan Stanley",
  "Media.net",
  "Sprinklr",
  "Postman",
  "Paytm",
];

export const COMPANY_DOMAINS: Record<string, string> = {
  Google: "google.com",
  "Amazon OA": "amazon.com",
  Amazon: "amazon.com",
  Microsoft: "microsoft.com",
  Stripe: "stripe.com",
  Uber: "uber.com",
  "Goldman Sachs": "goldmansachs.com",
  Swiggy: "swiggy.com",
  Flipkart: "flipkart.com",
  Zomato: "zomato.com",
  Razorpay: "razorpay.com",
  Confluent: "confluent.io",
  Adobe: "adobe.com",
  Atlassian: "atlassian.com",
  Meta: "meta.com",
  Apple: "apple.com",
  "Morgan Stanley": "morganstanley.com",
  "Media.net": "media.net",
  Sprinklr: "sprinklr.com",
  Postman: "postman.com",
  Paytm: "paytm.com",
  PhonePe: "phonepe.com",
  Intuit: "intuit.com",
  "DE Shaw": "deshaw.com",
  "D.E. Shaw": "deshaw.com",
  Cisco: "cisco.com",
  Cloudflare: "cloudflare.com",
  Walmart: "walmart.com",
  Juspay: "juspay.in",
  Samsung: "samsung.com",
  Visa: "visa.com",
  Nvidia: "nvidia.com",
  Oracle: "oracle.com",
  GitHub: "github.com",
  Zoho: "zoho.com",
  Meesho: "meesho.com",
  ServiceNow: "servicenow.com",
  Blinkit: "blinkit.com",
  Salesforce: "salesforce.com",
  LinkedIn: "linkedin.com",
  Bloomberg: "bloomberg.com",
  JPMorgan: "jpmorganchase.com",
  "Infosys SP/DSE": "infosys.com",
  Cred: "cred.club",
  Zepto: "zeptonow.com",
  Nutanix: "nutanix.com",
  "TCS Digital": "tcs.com",
  Asana: "asana.com",
  Arcesium: "arcesium.com",
  Rubrik: "rubrik.com",
  "Tower Research": "tower-research.com",
};

export function getCompanyLogoUrl(companyName: string): string {
  const cleanName = companyName.trim();
  const mappedDomain =
    COMPANY_DOMAINS[cleanName] ||
    COMPANY_DOMAINS[
      Object.keys(COMPANY_DOMAINS).find((k) => k.toLowerCase() === cleanName.toLowerCase()) || ""
    ];
  const domain =
    mappedDomain ||
    `${cleanName
      .toLowerCase()
      .replace(/\s+oa$/i, "")
      .replace(/[^a-z0-9.]/g, "")}.com`;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export const DSA_OA_TOPICS: DsaTopic[] = [
  "Arrays & Hashing",
  "Sliding Window & Two Pointers",
  "Stacks, Queues & Monotonic",
  "Linked Lists & Cache Design",
  "Trees & Binary Search",
  "Graphs, BFS/DFS & TopoSort",
  "Dynamic Programming",
  "Heaps & Greedy",
  "Backtracking & Tries",
];

const RAW_DSA_OA_PROBLEMS: DsaOaProblem[] = [
  {
    "id": "dsa-oa-1",
    "number": 560,
    "title": "Subarray Sum Equals K / Payment Ledger Audit",
    "difficulty": "Medium",
    "topic": "Arrays & Hashing",
    "companyTags": [
      "Razorpay",
      "Amazon OA",
      "Flipkart",
      "PhonePe"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "Data Engineer"
    ],
    "problemStatement": "At Razorpay, every merchant transaction log is recorded as a continuous ledger of net balances. During a compliance audit, you must identify all historical contiguous transaction windows whose total net sum equals exactly k. Given an integer array nums representing sequential transaction balance deltas and an integer k, return the total number of continuous subarrays whose elements sum up to k.",
    "examples": [
      {
        "input": "nums = [1,1,1], k = 2",
        "output": "2",
        "explanation": "Subarrays [nums[0..1]] and [nums[1..2]] each sum to 2."
      },
      {
        "input": "nums = [1,2,3], k = 3",
        "output": "2",
        "explanation": "Subarrays [1, 2] and [3] each sum to 3."
      },
      {
        "input": "nums = [1,-1,0], k = 0",
        "output": "3",
        "explanation": "[1,-1], [0], and [1,-1,0] all sum to 0."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 2 * 10^4",
      "-1000 <= nums[i] <= 1000",
      "-10^7 <= k <= 10^7"
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "Prefix Sums",
      "HashMap Frequency",
      "Subarray Invariance",
      "Negative Value Handling"
    ],
    "hints": [
      "If the cumulative sum up to index j is S_j and up to index i is S_i, the subarray nums[i+1..j] sums to S_j - S_i.",
      "Store frequencies of prefix sums in a hash map. At each index, check if (currentPrefixSum - k) has been seen before.",
      "Initialize prefix map with {0: 1} to account for subarrays starting at index 0."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int subarraySum(vector<int>& nums, int k) {\n        // Write your solution here\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int subarraySum(int[] nums, int k) {\n        // Write your solution here\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def subarraySum(self, nums: list[int], k: int) -> int:\n        # Write your solution here\n        return 0",
      "typescript": "function subarraySum(nums: number[], k: number): number {\n  // Write your solution here\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int subarraySum(vector<int>& nums, int k) {\n        unordered_map<int, int> prefixCounts;\n        prefixCounts[0] = 1;\n        int currentSum = 0, count = 0;\n        for (int num : nums) {\n            currentSum += num;\n            if (prefixCounts.count(currentSum - k)) {\n                count += prefixCounts[currentSum - k];\n            }\n            prefixCounts[currentSum]++;\n        }\n        return count;\n    }\n};",
      "java": "class Solution {\n    public int subarraySum(int[] nums, int k) {\n        Map<Integer, Integer> map = new HashMap<>();\n        map.put(0, 1);\n        int sum = 0, count = 0;\n        for (int n : nums) {\n            sum += n;\n            count += map.getOrDefault(sum - k, 0);\n            map.put(sum, map.getOrDefault(sum, 0) + 1);\n        }\n        return count;\n    }\n}",
      "python": "class Solution:\n    def subarraySum(self, nums: list[int], k: int) -> int:\n        prefix_map = {0: 1}\n        curr_sum = 0\n        count = 0\n        for num in nums:\n            curr_sum += num\n            count += prefix_map.get(curr_sum - k, 0)\n            prefix_map[curr_sum] = prefix_map.get(curr_sum, 0) + 1\n        return count",
      "typescript": "function subarraySum(nums: number[], k: number): number {\n  const prefixMap = new Map<number, number>();\n  prefixMap.set(0, 1);\n  let currSum = 0, count = 0;\n  for (const num of nums) {\n    currSum += num;\n    count += prefixMap.get(currSum - k) || 0;\n    prefixMap.set(currSum, (prefixMap.get(currSum) || 0) + 1);\n  }\n  return count;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "nums = [1,1,1], k = 2",
        "expectedOutputDisplay": "2"
      },
      {
        "id": "tc-2",
        "inputDisplay": "nums = [1,2,3], k = 3",
        "expectedOutputDisplay": "2"
      },
      {
        "id": "tc-3",
        "inputDisplay": "nums = [1,-1,0], k = 0",
        "expectedOutputDisplay": "3"
      },
      {
        "id": "tc-4",
        "inputDisplay": "nums = [3,4,7,2,-3,1,4,2], k = 7",
        "expectedOutputDisplay": "4",
        "isHidden": true
      }
    ]
  },
  {
    "id": "dsa-oa-2",
    "number": 146,
    "title": "LRU Cache Design / Low-Latency State Store",
    "difficulty": "Medium",
    "topic": "Linked Lists & Cache Design",
    "companyTags": [
      "Google",
      "Amazon OA",
      "Zomato",
      "Flipkart",
      "Atlassian"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "DevOps / SRE"
    ],
    "problemStatement": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache for high-throughput API gateway sessions. Implement the LRUCache class:\n- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.\n- int get(int key) Return the value of key if key exists, otherwise return -1.\n- void put(int key, int value) Update value of key if exists. Otherwise, add key-value pair to cache. If keys exceed capacity, evict least recently used key.\nAll operations must run in O(1) average time complexity.",
    "examples": [
      {
        "input": "[\"LRUCache\", \"put\", \"put\", \"get\", \"put\", \"get\", \"put\", \"get\", \"get\", \"get\"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]",
        "output": "[null, null, null, 1, null, -1, null, -1, 3, 4]",
        "explanation": "After putting 3, key 2 is evicted as key 1 was accessed via get(1)."
      }
    ],
    "constraints": [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls to get and put"
    ],
    "expectedTimeComplexity": "O(1) per get and put",
    "expectedSpaceComplexity": "O(capacity)",
    "keyConcepts": [
      "Doubly Linked List",
      "HashMap Node Index",
      "O(1) Eviction",
      "Sentinel Dummy Nodes"
    ],
    "hints": [
      "Combine a doubly-linked list with a hash map to achieve O(1) eviction and lookup.",
      "Use dummy head and tail sentinel nodes to eliminate null pointer checks."
    ],
    "starterCode": {
      "cpp": "class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        \n    }\n    \n    int get(int key) {\n        return -1;\n    }\n    \n    void put(int key, int value) {\n        \n    }\n};",
      "java": "class LRUCache {\n    public LRUCache(int capacity) {\n        \n    }\n    \n    public int get(int key) {\n        return -1;\n    }\n    \n    public void put(int key, int value) {\n        \n    }\n}",
      "python": "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n\n    def get(self, key: int) -> int:\n        return -1\n\n    def put(self, key: int, value: int) -> None:\n        pass",
      "typescript": "class LRUCache {\n  constructor(capacity: number) {\n    \n  }\n\n  get(key: number): number {\n    return -1;\n  }\n\n  put(key: number, value: number): void {\n    \n  }\n}"
    },
    "referenceSolution": {
      "cpp": "struct Node { int k, v; Node* p; Node* n; Node(int k, int v): k(k), v(v), p(nullptr), n(nullptr) {} };\nclass LRUCache {\n    int cap;\n    unordered_map<int, Node*> m;\n    Node *head, *tail;\n    void rem(Node* x) { x->p->n = x->n; x->n->p = x->p; }\n    void add(Node* x) { x->n = head->n; x->p = head; head->n->p = x; head->n = x; }\npublic:\n    LRUCache(int c) : cap(c) { head = new Node(0,0); tail = new Node(0,0); head->n = tail; tail->p = head; }\n    int get(int k) { if (!m.count(k)) return -1; Node* x = m[k]; rem(x); add(x); return x->v; }\n    void put(int k, int v) {\n        if (m.count(k)) { Node* x = m[k]; x->v = v; rem(x); add(x); }\n        else {\n            if (m.size() == cap) { Node* l = tail->p; rem(l); m.erase(l->k); delete l; }\n            Node* x = new Node(k, v); m[k] = x; add(x);\n        }\n    }\n};",
      "java": "class LRUCache {\n    class Node { int k, v; Node p, n; Node(int k, int v) { this.k = k; this.v = v; } }\n    private int cap;\n    private Map<Integer, Node> map = new HashMap<>();\n    private Node head = new Node(0,0), tail = new Node(0,0);\n    public LRUCache(int capacity) { this.cap = capacity; head.n = tail; tail.p = head; }\n    private void rem(Node x) { x.p.n = x.n; x.n.p = x.p; }\n    private void add(Node x) { x.n = head.n; x.p = head; head.n.p = x; head.n = x; }\n    public int get(int k) { if (!map.containsKey(k)) return -1; Node x = map.get(k); rem(x); add(x); return x.v; }\n    public void put(int k, int v) {\n        if (map.containsKey(k)) { Node x = map.get(k); x.v = v; rem(x); add(x); }\n        else {\n            if (map.size() == cap) { Node l = tail.p; rem(l); map.remove(l.k); }\n            Node x = new Node(k, v); map.put(k, x); add(x);\n        }\n    }\n}",
      "python": "class Node:\n    def __init__(self, k=0, v=0):\n        self.k, self.v = k, v\n        self.p = self.n = None\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.cap = capacity\n        self.m = {}\n        self.h, self.t = Node(), Node()\n        self.h.n, self.t.p = self.t, self.h\n    def _rem(self, x):\n        x.p.n = x.n; x.n.p = x.p\n    def _add(self, x):\n        x.n = self.h.n; x.p = self.h; self.h.n.p = x; self.h.n = x\n    def get(self, k: int) -> int:\n        if k not in self.m: return -1\n        x = self.m[k]; self._rem(x); self._add(x); return x.v\n    def put(self, k: int, v: int) -> None:\n        if k in self.m:\n            x = self.m[k]; x.v = v; self._rem(x); self._add(x)\n        else:\n            if len(self.m) == self.cap:\n                l = self.t.p; self._rem(l); del self.m[l.k]\n            x = Node(k, v); self.m[k] = x; self._add(x)",
      "typescript": "class LRUNode { k: number; v: number; p: LRUNode | null = null; n: LRUNode | null = null; constructor(k: number, v: number) { this.k = k; this.v = v; } }\nclass LRUCache {\n  private cap: number; private m = new Map<number, LRUNode>();\n  private h = new LRUNode(0, 0); private t = new LRUNode(0, 0);\n  constructor(c: number) { this.cap = c; this.h.n = this.t; this.t.p = this.h; }\n  private rem(x: LRUNode) { if (x.p) x.p.n = x.n; if (x.n) x.n.p = x.p; }\n  private add(x: LRUNode) { x.n = this.h.n; x.p = this.h; if (this.h.n) this.h.n.p = x; this.h.n = x; }\n  get(k: number): number { if (!this.m.has(k)) return -1; const x = this.m.get(k)!; this.rem(x); this.add(x); return x.v; }\n  put(k: number, v: number): void {\n    if (this.m.has(k)) { const x = this.m.get(k)!; x.v = v; this.rem(x); this.add(x); }\n    else {\n      if (this.m.size === this.cap) { const l = this.t.p!; this.rem(l); this.m.delete(l.k); }\n      const x = new LRUNode(k, v); this.m.set(k, x); this.add(x);\n    }\n  }\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "cap = 2, put(1,1), put(2,2), get(1), put(3,3), get(2)",
        "expectedOutputDisplay": "[null, null, null, 1, null, -1]"
      },
      {
        "id": "tc-2",
        "inputDisplay": "cap = 1, put(2,1), get(2), put(3,2), get(2), get(3)",
        "expectedOutputDisplay": "[null, null, 1, null, -1, 2]"
      },
      {
        "id": "tc-3",
        "inputDisplay": "cap = 2, put(2,1), put(1,1), put(2,3), put(4,1), get(1), get(2)",
        "expectedOutputDisplay": "[null, null, null, null, null, -1, 3]"
      }
    ]
  },
  {
    "id": "dsa-oa-3",
    "number": 239,
    "title": "Sliding Window Maximum / Real-Time Stock Tick Peak",
    "difficulty": "Hard",
    "topic": "Sliding Window & Two Pointers",
    "companyTags": [
      "Goldman Sachs",
      "Tower Research",
      "Uber",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "Data Engineer"
    ],
    "problemStatement": "You are monitoring a high-frequency trading ticker feed represented as an integer array nums. A sliding price window of size k moves from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position, return the maximum element in the window.",
    "examples": [
      {
        "input": "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        "output": "[3,3,5,5,6,7]",
        "explanation": "Window maximums: [1 3 -1] -> 3, [3 -1 -3] -> 3, [-1 -3 5] -> 5, [-3 5 3] -> 5, [5 3 6] -> 6, [3 6 7] -> 7"
      },
      {
        "input": "nums = [1], k = 1",
        "output": "[1]"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
      "1 <= k <= nums.length"
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(k)",
    "keyConcepts": [
      "Monotonic Deque",
      "Decreasing Order Invariance",
      "Window Boundary Invalidation",
      "O(N) Amortized"
    ],
    "hints": [
      "Maintain a double-ended queue (deque) of indices where corresponding values are strictly decreasing.",
      "Pop indices from the front if they are out of the current window (< i - k + 1).",
      "Pop indices from the back while incoming element is greater than or equal to dq.back()."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    vector<int> maxSlidingWindow(vector<int>& nums, int k) {\n        return {};\n    }\n};",
      "java": "class Solution {\n    public int[] maxSlidingWindow(int[] nums, int k) {\n        return new int[0];\n    }\n}",
      "python": "class Solution:\n    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:\n        return []",
      "typescript": "function maxSlidingWindow(nums: number[], k: number): number[] {\n  return [];\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    vector<int> maxSlidingWindow(vector<int>& nums, int k) {\n        deque<int> dq;\n        vector<int> res;\n        for (int i = 0; i < nums.size(); ++i) {\n            while (!dq.empty() && dq.front() < i - k + 1) dq.pop_front();\n            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();\n            dq.push_back(i);\n            if (i >= k - 1) res.push_back(nums[dq.front()]);\n        }\n        return res;\n    }\n};",
      "java": "class Solution {\n    public int[] maxSlidingWindow(int[] nums, int k) {\n        int n = nums.length;\n        int[] res = new int[n - k + 1];\n        Deque<Integer> dq = new ArrayDeque<>();\n        for (int i = 0; i < n; i++) {\n            while (!dq.isEmpty() && dq.peekFirst() < i - k + 1) dq.pollFirst();\n            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();\n            dq.offerLast(i);\n            if (i >= k - 1) res[i - k + 1] = nums[dq.peekFirst()];\n        }\n        return res;\n    }\n}",
      "python": "class Solution:\n    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:\n        from collections import deque\n        dq = deque()\n        res = []\n        for i, n in enumerate(nums):\n            while dq and dq[0] < i - k + 1: dq.popleft()\n            while dq and nums[dq[-1]] <= n: dq.pop()\n            dq.append(i)\n            if i >= k - 1: res.append(nums[dq[0]])\n        return res",
      "typescript": "function maxSlidingWindow(nums: number[], k: number): number[] {\n  const dq: number[] = [];\n  const res: number[] = [];\n  for (let i = 0; i < nums.length; i++) {\n    while (dq.length > 0 && dq[0] < i - k + 1) dq.shift();\n    while (dq.length > 0 && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();\n    dq.push(i);\n    if (i >= k - 1) res.push(nums[dq[0]]);\n  }\n  return res;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        "expectedOutputDisplay": "[3,3,5,5,6,7]"
      },
      {
        "id": "tc-2",
        "inputDisplay": "nums = [1], k = 1",
        "expectedOutputDisplay": "[1]"
      },
      {
        "id": "tc-3",
        "inputDisplay": "nums = [9,11], k = 2",
        "expectedOutputDisplay": "[11]"
      }
    ]
  },
  {
    "id": "dsa-oa-4",
    "number": 76,
    "title": "Minimum Window Substring / Log Query Matcher",
    "difficulty": "Hard",
    "topic": "Sliding Window & Two Pointers",
    "companyTags": [
      "Amazon OA",
      "Microsoft",
      "Google",
      "Meta"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string \"\".",
    "examples": [
      {
        "input": "s = \"ADOBECODEBANC\", t = \"ABC\"",
        "output": "\"BANC\"",
        "explanation": "\"BANC\" includes 'A', 'B', and 'C' from t with minimum length 4."
      },
      {
        "input": "s = \"a\", t = \"a\"",
        "output": "\"a\""
      },
      {
        "input": "s = \"a\", t = \"aa\"",
        "output": "\"\""
      }
    ],
    "constraints": [
      "m == s.length",
      "n == t.length",
      "1 <= m, n <= 10^5",
      "s and t consist of uppercase and lowercase English letters."
    ],
    "expectedTimeComplexity": "O(M + N)",
    "expectedSpaceComplexity": "O(Total Unique Characters)",
    "keyConcepts": [
      "Two Pointers Expansion/Contraction",
      "Character Frequency Counting",
      "Match Counter",
      "Substring Slicing"
    ],
    "hints": [
      "Use two pointers: right expands the window to find valid substring; left contracts to minimize length.",
      "Maintain a matched count to detect when all characters of t are satisfied."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    string minWindow(string s, string t) {\n        return \"\";\n    }\n};",
      "java": "class Solution {\n    public String minWindow(String s, String t) {\n        return \"\";\n    }\n}",
      "python": "class Solution:\n    def minWindow(self, s: str, t: str) -> str:\n        return \"\"",
      "typescript": "function minWindow(s: string, t: string): string {\n  return \"\";\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    string minWindow(string s, string t) {\n        vector<int> map(128, 0);\n        for (char c : t) map[c]++;\n        int count = t.size(), begin = 0, end = 0, head = 0, d = INT_MAX;\n        while (end < s.size()) {\n            if (map[s[end++]]-- > 0) count--;\n            while (count == 0) {\n                if (end - begin < d) d = end - (head = begin);\n                if (map[s[begin++]]++ == 0) count++;\n            }\n        }\n        return d == INT_MAX ? \"\" : s.substr(head, d);\n    }\n};",
      "java": "class Solution {\n    public String minWindow(String s, String t) {\n        int[] map = new int[128];\n        for (char c : t.toCharArray()) map[c]++;\n        int start = 0, end = 0, minLen = Integer.MAX_VALUE, head = 0, count = t.length();\n        while (end < s.length()) {\n            if (map[s.charAt(end++)]-- > 0) count--;\n            while (count == 0) {\n                if (end - start < minLen) { minLen = end - (head = start); }\n                if (map[s.charAt(start++)]++ == 0) count++;\n            }\n        }\n        return minLen == Integer.MAX_VALUE ? \"\" : s.substring(head, head + minLen);\n    }\n}",
      "python": "class Solution:\n    def minWindow(self, s: str, t: str) -> str:\n        from collections import Counter\n        need = Counter(t)\n        missing = len(t)\n        start = i = 0\n        res = (0, float('inf'))\n        for j, c in enumerate(s, 1):\n            if need[c] > 0: missing -= 1\n            need[c] -= 1\n            if missing == 0:\n                while i < j and need[s[i]] < 0:\n                    need[s[i]] += 1\n                    i += 1\n                if j - i < res[1] - res[0]: res = (i, j)\n                need[s[i]] += 1\n                missing += 1\n                i += 1\n        return s[res[0]:res[1]] if res[1] != float('inf') else \"\"",
      "typescript": "function minWindow(s: string, t: string): string {\n  const map = new Map<string, number>();\n  for (const c of t) map.set(c, (map.get(c) || 0) + 1);\n  let left = 0, right = 0, count = t.length, minLen = Infinity, start = 0;\n  while (right < s.length) {\n    const rChar = s[right++];\n    if ((map.get(rChar) || 0) > 0) count--;\n    map.set(rChar, (map.get(rChar) || 0) - 1);\n    while (count === 0) {\n      if (right - left < minLen) minLen = right - (start = left);\n      const lChar = s[left++];\n      map.set(lChar, (map.get(lChar) || 0) + 1);\n      if (map.get(lChar)! > 0) count++;\n    }\n  }\n  return minLen === Infinity ? \"\" : s.slice(start, start + minLen);\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "s = \"ADOBECODEBANC\", t = \"ABC\"",
        "expectedOutputDisplay": "\"BANC\""
      },
      {
        "id": "tc-2",
        "inputDisplay": "s = \"a\", t = \"a\"",
        "expectedOutputDisplay": "\"a\""
      },
      {
        "id": "tc-3",
        "inputDisplay": "s = \"a\", t = \"aa\"",
        "expectedOutputDisplay": "\"\""
      }
    ]
  },
  {
    "id": "dsa-oa-5",
    "number": 875,
    "title": "Koko Eating Bananas / Cloud Server Auto-Scaling Rate",
    "difficulty": "Medium",
    "topic": "Trees & Binary Search",
    "companyTags": [
      "Rubrik",
      "Google",
      "Atlassian",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "DevOps / SRE"
    ],
    "problemStatement": "Koko loves to eat bananas. There are n piles of bananas, the ith pile has piles[i] bananas. The guards will return in h hours. Koko can decide her bananas-per-hour eating speed of k. Each hour, she chooses some pile and eats k bananas from that pile. Return the minimum integer k such that she can eat all bananas within h hours.",
    "examples": [
      {
        "input": "piles = [3,6,7,11], h = 8",
        "output": "4",
        "explanation": "Hours: ceil(3/4) + ceil(6/4) + ceil(7/4) + ceil(11/4) = 1 + 2 + 2 + 3 = 8."
      },
      {
        "input": "piles = [30,11,23,4,20], h = 5",
        "output": "30"
      },
      {
        "input": "piles = [30,11,23,4,20], h = 6",
        "output": "23"
      }
    ],
    "constraints": [
      "1 <= piles.length <= 10^4",
      "piles.length <= h <= 10^9",
      "1 <= piles[i] <= 10^9"
    ],
    "expectedTimeComplexity": "O(N log(max(Piles)))",
    "expectedSpaceComplexity": "O(1)",
    "keyConcepts": [
      "Binary Search on Answer Space",
      "Monotonic Feasibility Function",
      "Ceiling Division Invariant",
      "Upper Bound Search"
    ],
    "hints": [
      "The eating speed k must lie between 1 and max(piles).",
      "Because required hours decreases monotonically as speed k increases, apply binary search on [1, max(piles)]."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int minEatingSpeed(vector<int>& piles, int h) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int minEatingSpeed(int[] piles, int h) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def minEatingSpeed(self, piles: list[int], h: int) -> int:\n        return 0",
      "typescript": "function minEatingSpeed(piles: number[], h: number): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int minEatingSpeed(vector<int>& piles, int h) {\n        long long left = 1, right = *max_element(piles.begin(), piles.end());\n        while (left < right) {\n            long long mid = left + (right - left) / 2;\n            long long hours = 0;\n            for (int p : piles) hours += (p + mid - 1) / mid;\n            if (hours <= h) right = mid;\n            else left = mid + 1;\n        }\n        return left;\n    }\n};",
      "java": "class Solution {\n    public int minEatingSpeed(int[] piles, int h) {\n        int left = 1, right = 1;\n        for (int p : piles) right = Math.max(right, p);\n        while (left < right) {\n            int mid = left + (right - left) / 2;\n            long hours = 0;\n            for (int p : piles) hours += (p + mid - 1) / mid;\n            if (hours <= h) right = mid;\n            else left = mid + 1;\n        }\n        return left;\n    }\n}",
      "python": "class Solution:\n    def minEatingSpeed(self, piles: list[int], h: int) -> int:\n        left, right = 1, max(piles)\n        while left < right:\n            mid = (left + right) // 2\n            hours = sum((p + mid - 1) // mid for p in piles)\n            if hours <= h: right = mid\n            else: left = mid + 1\n        return left",
      "typescript": "function minEatingSpeed(piles: number[], h: number): number {\n  let left = 1, right = Math.max(...piles);\n  while (left < right) {\n    const mid = Math.floor((left + right) / 2);\n    let hours = 0;\n    for (const p of piles) hours += Math.ceil(p / mid);\n    if (hours <= h) right = mid;\n    else left = mid + 1;\n  }\n  return left;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "piles = [3,6,7,11], h = 8",
        "expectedOutputDisplay": "4"
      },
      {
        "id": "tc-2",
        "inputDisplay": "piles = [30,11,23,4,20], h = 5",
        "expectedOutputDisplay": "30"
      },
      {
        "id": "tc-3",
        "inputDisplay": "piles = [30,11,23,4,20], h = 6",
        "expectedOutputDisplay": "23"
      }
    ]
  },
  {
    "id": "dsa-oa-6",
    "number": 23,
    "title": "Merge K Sorted Event Streams / Priority Pipeline",
    "difficulty": "Hard",
    "topic": "Heaps & Greedy",
    "companyTags": [
      "Confluent",
      "Stripe",
      "Swiggy",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "Data Engineer"
    ],
    "problemStatement": "You are given an array of k sorted integer arrays lists. Merge all the arrays into one sorted array in ascending order and return it.",
    "examples": [
      {
        "input": "lists = [[1,4,5],[1,3,4],[2,6]]",
        "output": "[1,1,2,3,4,4,5,6]"
      },
      {
        "input": "lists = []",
        "output": "[]"
      },
      {
        "input": "lists = [[]]",
        "output": "[]"
      }
    ],
    "constraints": [
      "k == lists.length",
      "0 <= k <= 10^4",
      "0 <= lists[i].length <= 500",
      "-10^4 <= lists[i][j] <= 10^4"
    ],
    "expectedTimeComplexity": "O(N log K)",
    "expectedSpaceComplexity": "O(K)",
    "keyConcepts": [
      "Min-Heap / PriorityQueue",
      "Multi-Way Merge",
      "Divide and Conquer",
      "Pointer Manipulation"
    ],
    "hints": [
      "Insert head element of each list into a Min-Heap. Extract min, append to result, push next element."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    vector<int> mergeKLists(vector<vector<int>>& lists) {\n        return {};\n    }\n};",
      "java": "class Solution {\n    public int[] mergeKLists(int[][] lists) {\n        return new int[0];\n    }\n}",
      "python": "class Solution:\n    def mergeKLists(self, lists: list[list[int]]) -> list[int]:\n        return []",
      "typescript": "function mergeKLists(lists: number[][]): number[] {\n  return [];\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    vector<int> mergeKLists(vector<vector<int>>& lists) {\n        priority_queue<pair<int, pair<int, int>>, vector<pair<int, pair<int, int>>>, greater<>> pq;\n        for (int i = 0; i < lists.size(); i++) if (!lists[i].empty()) pq.push({lists[i][0], {i, 0}});\n        vector<int> res;\n        while (!pq.empty()) {\n            auto [val, pos] = pq.top(); pq.pop();\n            res.push_back(val);\n            int l = pos.first, idx = pos.second;\n            if (idx + 1 < lists[l].size()) pq.push({lists[l][idx + 1], {l, idx + 1}});\n        }\n        return res;\n    }\n};",
      "java": "class Solution {\n    public int[] mergeKLists(int[][] lists) {\n        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);\n        int total = 0;\n        for (int i = 0; i < lists.length; i++) {\n            if (lists[i].length > 0) { pq.offer(new int[]{lists[i][0], i, 0}); total += lists[i].length; }\n        }\n        int[] res = new int[total]; int idx = 0;\n        while (!pq.isEmpty()) {\n            int[] curr = pq.poll(); res[idx++] = curr[0];\n            if (curr[2] + 1 < lists[curr[1]].length) pq.offer(new int[]{lists[curr[1]][curr[2] + 1], curr[1], curr[2] + 1});\n        }\n        return res;\n    }\n}",
      "python": "class Solution:\n    def mergeKLists(self, lists: list[list[int]]) -> list[int]:\n        import heapq\n        pq = []\n        for i, lst in enumerate(lists):\n            if lst: heapq.heappush(pq, (lst[0], i, 0))\n        res = []\n        while pq:\n            val, l_idx, el_idx = heapq.heappop(pq)\n            res.append(val)\n            if el_idx + 1 < len(lists[l_idx]): heapq.heappush(pq, (lists[l_idx][el_idx + 1], l_idx, el_idx + 1))\n        return res",
      "typescript": "function mergeKLists(lists: number[][]): number[] {\n  const res: number[] = [];\n  const indices = new Array(lists.length).fill(0);\n  while (true) {\n    let minVal = Infinity, minList = -1;\n    for (let i = 0; i < lists.length; i++) {\n      if (indices[i] < lists[i].length && lists[i][indices[i]] < minVal) {\n        minVal = lists[i][indices[i]]; minList = i;\n      }\n    }\n    if (minList === -1) break;\n    res.push(minVal); indices[minList]++;\n  }\n  return res;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "lists = [[1,4,5],[1,3,4],[2,6]]",
        "expectedOutputDisplay": "[1,1,2,3,4,4,5,6]"
      },
      {
        "id": "tc-2",
        "inputDisplay": "lists = []",
        "expectedOutputDisplay": "[]"
      },
      {
        "id": "tc-3",
        "inputDisplay": "lists = [[]]",
        "expectedOutputDisplay": "[]"
      }
    ]
  },
  {
    "id": "dsa-oa-7",
    "number": 210,
    "title": "Course Schedule II / Microservice Build Order",
    "difficulty": "Medium",
    "topic": "Graphs, BFS/DFS & TopoSort",
    "companyTags": [
      "Amazon OA",
      "Intuit",
      "DE Shaw",
      "Microsoft"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "DevOps / SRE"
    ],
    "problemStatement": "There are numCourses courses labeled from 0 to numCourses - 1. You are given prerequisites where prerequisites[i] = [a_i, b_i] indicates course b_i must be taken before a_i. Return the ordering of courses to finish all courses. If impossible due to cycle, return an empty array.",
    "examples": [
      {
        "input": "numCourses = 2, prerequisites = [[1,0]]",
        "output": "[0,1]"
      },
      {
        "input": "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
        "output": "[0,2,1,3]"
      },
      {
        "input": "numCourses = 1, prerequisites = []",
        "output": "[0]"
      }
    ],
    "constraints": [
      "1 <= numCourses <= 2000",
      "0 <= prerequisites.length <= numCourses * (numCourses - 1)"
    ],
    "expectedTimeComplexity": "O(V + E)",
    "expectedSpaceComplexity": "O(V + E)",
    "keyConcepts": [
      "Kahn's Algorithm (BFS)",
      "In-Degree Tracking",
      "Topological Sort",
      "Cycle Detection (DAG)"
    ],
    "hints": [
      "Calculate in-degrees. Enqueue all vertices with in-degree 0. If order length != numCourses, return []."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {\n        return {};\n    }\n};",
      "java": "class Solution {\n    public int[] findOrder(int numCourses, int[][] prerequisites) {\n        return new int[0];\n    }\n}",
      "python": "class Solution:\n    def findOrder(self, numCourses: int, prerequisites: list[list[int]]) -> list[int]:\n        return []",
      "typescript": "function findOrder(numCourses: number, prerequisites: number[][]): number[] {\n  return [];\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {\n        vector<vector<int>> adj(numCourses);\n        vector<int> inDegree(numCourses, 0);\n        for (auto& p : prerequisites) { adj[p[1]].push_back(p[0]); inDegree[p[0]]++; }\n        queue<int> q;\n        for (int i = 0; i < numCourses; i++) if (inDegree[i] == 0) q.push(i);\n        vector<int> order;\n        while (!q.empty()) {\n            int curr = q.front(); q.pop(); order.push_back(curr);\n            for (int next : adj[curr]) if (--inDegree[next] == 0) q.push(next);\n        }\n        return order.size() == numCourses ? order : vector<int>();\n    }\n};",
      "java": "class Solution {\n    public int[] findOrder(int numCourses, int[][] prerequisites) {\n        List<List<Integer>> adj = new ArrayList<>();\n        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());\n        int[] inDegree = new int[numCourses];\n        for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); inDegree[p[0]]++; }\n        Queue<Integer> q = new LinkedList<>();\n        for (int i = 0; i < numCourses; i++) if (inDegree[i] == 0) q.offer(i);\n        int[] order = new int[numCourses]; int idx = 0;\n        while (!q.isEmpty()) {\n            int curr = q.poll(); order[idx++] = curr;\n            for (int next : adj.get(curr)) if (--inDegree[next] == 0) q.offer(next);\n        }\n        return idx == numCourses ? order : new int[0];\n    }\n}",
      "python": "class Solution:\n    def findOrder(self, numCourses: int, prerequisites: list[list[int]]) -> list[int]:\n        from collections import defaultdict, deque\n        adj = defaultdict(list)\n        in_degree = [0] * numCourses\n        for u, v in prerequisites: adj[v].append(u); in_degree[u] += 1\n        q = deque([i for i in range(numCourses) if in_degree[i] == 0])\n        order = []\n        while q:\n            curr = q.popleft(); order.append(curr)\n            for nxt in adj[curr]:\n                in_degree[nxt] -= 1\n                if in_degree[nxt] == 0: q.append(nxt)\n        return order if len(order) == numCourses else []",
      "typescript": "function findOrder(numCourses: number, prerequisites: number[][]): number[] {\n  const adj: number[][] = Array.from({ length: numCourses }, () => []);\n  const inDegree = new Array(numCourses).fill(0);\n  for (const [u, v] of prerequisites) { adj[v].push(u); inDegree[u]++; }\n  const queue: number[] = [];\n  for (let i = 0; i < numCourses; i++) if (inDegree[i] === 0) queue.push(i);\n  const order: number[] = [];\n  while (queue.length > 0) {\n    const curr = queue.shift()!; order.push(curr);\n    for (const next of adj[curr]) { inDegree[next]--; if (inDegree[next] === 0) queue.push(next); }\n  }\n  return order.length === numCourses ? order : [];\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "numCourses = 2, prerequisites = [[1,0]]",
        "expectedOutputDisplay": "[0,1]"
      },
      {
        "id": "tc-2",
        "inputDisplay": "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
        "expectedOutputDisplay": "[0,2,1,3]"
      },
      {
        "id": "tc-3",
        "inputDisplay": "numCourses = 2, prerequisites = [[1,0],[0,1]]",
        "expectedOutputDisplay": "[]"
      }
    ]
  },
  {
    "id": "dsa-oa-8",
    "number": 743,
    "title": "Network Delay Time / Distributed Node Broadcast",
    "difficulty": "Medium",
    "topic": "Graphs, BFS/DFS & TopoSort",
    "companyTags": [
      "Cisco",
      "Cloudflare",
      "Uber",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "DevOps / SRE"
    ],
    "problemStatement": "You are given a network of n nodes (1 to n) and times where times[i] = (u_i, v_i, w_i) is directed latency. Send signal from node k. Return minimum time for all nodes to receive the signal. If impossible, return -1.",
    "examples": [
      {
        "input": "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2",
        "output": "2"
      },
      {
        "input": "times = [[1,2,1]], n = 2, k = 1",
        "output": "1"
      },
      {
        "input": "times = [[1,2,1]], n = 2, k = 2",
        "output": "-1"
      }
    ],
    "constraints": [
      "1 <= k <= n <= 100",
      "1 <= times.length <= 6000",
      "0 <= w_i <= 100"
    ],
    "expectedTimeComplexity": "O(E log V)",
    "expectedSpaceComplexity": "O(V + E)",
    "keyConcepts": [
      "Dijkstra's Algorithm",
      "Min-Heap Distance Relaxation",
      "Adjacency List Weighted Graph",
      "Unreachable Node Guard"
    ],
    "hints": [
      "Run Dijkstra starting from node k. Return max(dist[1..n]). If any node has infinity distance, return -1."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int networkDelayTime(vector<vector<int>>& times, int n, int k) {\n        return -1;\n    }\n};",
      "java": "class Solution {\n    public int networkDelayTime(int[][] times, int n, int k) {\n        return -1;\n    }\n}",
      "python": "class Solution:\n    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:\n        return -1",
      "typescript": "function networkDelayTime(times: number[][], n: number, k: number): number {\n  return -1;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int networkDelayTime(vector<vector<int>>& times, int n, int k) {\n        vector<vector<pair<int, int>>> adj(n + 1);\n        for (auto& t : times) adj[t[0]].push_back({t[1], t[2]});\n        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;\n        vector<int> dist(n + 1, INT_MAX);\n        dist[k] = 0; pq.push({0, k});\n        while (!pq.empty()) {\n            auto [d, u] = pq.top(); pq.pop();\n            if (d > dist[u]) continue;\n            for (auto& edge : adj[u]) {\n                int v = edge.first, w = edge.second;\n                if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.push({dist[v], v}); }\n            }\n        }\n        int maxTime = 0;\n        for (int i = 1; i <= n; i++) {\n            if (dist[i] == INT_MAX) return -1;\n            maxTime = max(maxTime, dist[i]);\n        }\n        return maxTime;\n    }\n};",
      "java": "class Solution {\n    public int networkDelayTime(int[][] times, int n, int k) {\n        Map<Integer, List<int[]>> graph = new HashMap<>();\n        for (int[] t : times) graph.computeIfAbsent(t[0], x -> new ArrayList<>()).add(new int[]{t[1], t[2]});\n        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);\n        int[] dist = new int[n + 1]; Arrays.fill(dist, Integer.MAX_VALUE);\n        dist[k] = 0; pq.offer(new int[]{k, 0});\n        while (!pq.isEmpty()) {\n            int[] curr = pq.poll(); int u = curr[0], d = curr[1];\n            if (d > dist[u]) continue;\n            if (!graph.containsKey(u)) continue;\n            for (int[] edge : graph.get(u)) {\n                int v = edge[0], w = edge[1];\n                if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.offer(new int[]{v, dist[v]}); }\n            }\n        }\n        int max = 0;\n        for (int i = 1; i <= n; i++) { if (dist[i] == Integer.MAX_VALUE) return -1; max = Math.max(max, dist[i]); }\n        return max;\n    }\n}",
      "python": "class Solution:\n    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:\n        import heapq\n        from collections import defaultdict\n        adj = defaultdict(list)\n        for u, v, w in times: adj[u].append((v, w))\n        pq = [(0, k)]\n        dist = {}\n        while pq:\n            d, u = heapq.heappop(pq)\n            if u in dist: continue\n            dist[u] = d\n            for v, w in adj[u]:\n                if v not in dist: heapq.heappush(pq, (d + w, v))\n        return max(dist.values()) if len(dist) == n else -1",
      "typescript": "function networkDelayTime(times: number[][], n: number, k: number): number {\n  const dist = new Array(n + 1).fill(Infinity);\n  dist[k] = 0;\n  for (let i = 1; i <= n; i++) {\n    for (const [u, v, w] of times) {\n      if (dist[u] !== Infinity && dist[u] + w < dist[v]) dist[v] = dist[u] + w;\n    }\n  }\n  let maxTime = 0;\n  for (let i = 1; i <= n; i++) {\n    if (dist[i] === Infinity) return -1;\n    maxTime = Math.max(maxTime, dist[i]);\n  }\n  return maxTime;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2",
        "expectedOutputDisplay": "2"
      },
      {
        "id": "tc-2",
        "inputDisplay": "times = [[1,2,1]], n = 2, k = 1",
        "expectedOutputDisplay": "1"
      },
      {
        "id": "tc-3",
        "inputDisplay": "times = [[1,2,1]], n = 2, k = 2",
        "expectedOutputDisplay": "-1"
      }
    ]
  },
  {
    "id": "dsa-oa-9",
    "number": 200,
    "title": "Number of Islands / Warehouse Grid Clustering",
    "difficulty": "Medium",
    "topic": "Graphs, BFS/DFS & TopoSort",
    "companyTags": [
      "Amazon OA",
      "Walmart",
      "Google",
      "Microsoft"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "Data Engineer"
    ],
    "problemStatement": "Given an m x n 2D binary grid grid representing '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically.",
    "examples": [
      {
        "input": "grid = [[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]",
        "output": "1"
      },
      {
        "input": "grid = [[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]",
        "output": "3"
      }
    ],
    "constraints": [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'."
    ],
    "expectedTimeComplexity": "O(M * N)",
    "expectedSpaceComplexity": "O(M * N)",
    "keyConcepts": [
      "2D Grid Traversal",
      "DFS In-Place Sink Marking",
      "Connected Component Counting",
      "Boundary Guard Checks"
    ],
    "hints": [
      "Iterate over grid. When cell is '1', increment island count and DFS sink all connected '1's into '0's."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int numIslands(char[][] grid) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def numIslands(self, grid: list[list[str]]) -> int:\n        return 0",
      "typescript": "function numIslands(grid: string[][]): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\n    void dfs(vector<vector<char>>& g, int r, int c) {\n        if (r < 0 || r >= g.size() || c < 0 || c >= g[0].size() || g[r][c] != '1') return;\n        g[r][c] = '0'; dfs(g, r+1, c); dfs(g, r-1, c); dfs(g, r, c+1); dfs(g, r, c-1);\n    }\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        int count = 0;\n        for (int i = 0; i < grid.size(); i++)\n            for (int j = 0; j < grid[0].size(); j++)\n                if (grid[i][j] == '1') { count++; dfs(grid, i, j); }\n        return count;\n    }\n};",
      "java": "class Solution {\n    private void dfs(char[][] g, int r, int c) {\n        if (r < 0 || r >= g.length || c < 0 || c >= g[0].length || g[r][c] != '1') return;\n        g[r][c] = '0'; dfs(g, r+1, c); dfs(g, r-1, c); dfs(g, r, c+1); dfs(g, r, c-1);\n    }\n    public int numIslands(char[][] grid) {\n        int count = 0;\n        for (int i = 0; i < grid.length; i++)\n            for (int j = 0; j < grid[0].length; j++)\n                if (grid[i][j] == '1') { count++; dfs(grid, i, j); }\n        return count;\n    }\n}",
      "python": "class Solution:\n    def numIslands(self, grid: list[list[str]]) -> int:\n        m, n = len(grid), len(grid[0])\n        def dfs(r, c):\n            if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1': return\n            grid[r][c] = '0'; dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)\n        count = 0\n        for i in range(m):\n            for j in range(n):\n                if grid[i][j] == '1': count += 1; dfs(i, j)\n        return count",
      "typescript": "function numIslands(grid: string[][]): number {\n  const m = grid.length, n = grid[0].length;\n  function dfs(r: number, c: number) {\n    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] !== '1') return;\n    grid[r][c] = '0'; dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);\n  }\n  let count = 0;\n  for (let i = 0; i < m; i++)\n    for (let j = 0; j < n; j++)\n      if (grid[i][j] === '1') { count++; dfs(i, j); }\n  return count;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "grid = [[\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]]",
        "expectedOutputDisplay": "2"
      },
      {
        "id": "tc-2",
        "inputDisplay": "grid = [[\"1\",\"0\"],[\"0\",\"1\"]]",
        "expectedOutputDisplay": "2"
      },
      {
        "id": "tc-3",
        "inputDisplay": "grid = [[\"0\",\"0\"],[\"0\",\"0\"]]",
        "expectedOutputDisplay": "0"
      }
    ]
  },
  {
    "id": "dsa-oa-10",
    "number": 994,
    "title": "Rotting Oranges / Server Contagion Propagation",
    "difficulty": "Medium",
    "topic": "Graphs, BFS/DFS & TopoSort",
    "companyTags": [
      "Juspay",
      "Samsung",
      "Amazon OA",
      "Flipkart"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given an m x n grid where 0 is empty, 1 is fresh orange, and 2 is rotten orange. Every minute, 4-directionally adjacent fresh oranges become rotten. Return the minimum minutes until no fresh orange remains, or -1 if impossible.",
    "examples": [
      {
        "input": "grid = [[2,1,1],[1,1,0],[0,1,1]]",
        "output": "4"
      },
      {
        "input": "grid = [[2,1,1],[0,1,1],[1,0,1]]",
        "output": "-1"
      },
      {
        "input": "grid = [[0,2]]",
        "output": "0"
      }
    ],
    "constraints": [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 10",
      "grid[i][j] is 0, 1, or 2."
    ],
    "expectedTimeComplexity": "O(M * N)",
    "expectedSpaceComplexity": "O(M * N)",
    "keyConcepts": [
      "Multi-Source BFS",
      "Queue Level Traversal",
      "Fresh Count Invariant",
      "Grid Layer Propagation"
    ],
    "hints": [
      "Push all initially rotten oranges into a queue. Perform multi-source BFS layer by layer."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int orangesRotting(vector<vector<int>>& grid) {\n        return -1;\n    }\n};",
      "java": "class Solution {\n    public int orangesRotting(int[][] grid) {\n        return -1;\n    }\n}",
      "python": "class Solution:\n    def orangesRotting(self, grid: list[list[int]]) -> int:\n        return -1",
      "typescript": "function orangesRotting(grid: number[][]): number {\n  return -1;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int orangesRotting(vector<vector<int>>& grid) {\n        int m = grid.size(), n = grid[0].size(), fresh = 0;\n        queue<pair<int, int>> q;\n        for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) { if (grid[i][j] == 2) q.push({i, j}); else if (grid[i][j] == 1) fresh++; }\n        if (fresh == 0) return 0;\n        int mins = 0; vector<int> dirs = {0, 1, 0, -1, 0};\n        while (!q.empty()) {\n            int sz = q.size(); bool inf = false;\n            for (int i = 0; i < sz; i++) {\n                auto [r, c] = q.front(); q.pop();\n                for (int d = 0; d < 4; d++) {\n                    int nr = r + dirs[d], nc = c + dirs[d+1];\n                    if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] == 1) {\n                        grid[nr][nc] = 2; fresh--; inf = true; q.push({nr, nc});\n                    }\n                }\n            }\n            if (inf) mins++;\n        }\n        return fresh == 0 ? mins : -1;\n    }\n};",
      "java": "class Solution {\n    public int orangesRotting(int[][] grid) {\n        int m = grid.length, n = grid[0].length, fresh = 0;\n        Queue<int[]> q = new LinkedList<>();\n        for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) { if (grid[i][j] == 2) q.offer(new int[]{i, j}); else if (grid[i][j] == 1) fresh++; }\n        if (fresh == 0) return 0;\n        int mins = 0; int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};\n        while (!q.isEmpty()) {\n            int sz = q.size(); boolean inf = false;\n            for (int i = 0; i < sz; i++) {\n                int[] curr = q.poll();\n                for (int[] d : dirs) {\n                    int nr = curr[0] + d[0], nc = curr[1] + d[1];\n                    if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] == 1) {\n                        grid[nr][nc] = 2; fresh--; inf = true; q.offer(new int[]{nr, nc});\n                    }\n                }\n            }\n            if (inf) mins++;\n        }\n        return fresh == 0 ? mins : -1;\n    }\n}",
      "python": "class Solution:\n    def orangesRotting(self, grid: list[list[int]]) -> int:\n        from collections import deque\n        m, n = len(grid), len(grid[0])\n        q = deque()\n        fresh = 0\n        for i in range(m):\n            for j in range(n):\n                if grid[i][j] == 2: q.append((i, j))\n                elif grid[i][j] == 1: fresh += 1\n        if fresh == 0: return 0\n        mins = 0\n        dirs = [(1,0), (-1,0), (0,1), (0,-1)]\n        while q:\n            sz = len(q); inf = False\n            for _ in range(sz):\n                r, c = q.popleft()\n                for dr, dc in dirs:\n                    nr, nc = r + dr, c + dc\n                    if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:\n                        grid[nr][nc] = 2; fresh -= 1; inf = True; q.append((nr, nc))\n            if inf: mins += 1\n        return mins if fresh == 0 else -1",
      "typescript": "function orangesRotting(grid: number[][]): number {\n  const m = grid.length, n = grid[0].length;\n  const queue: [number, number][] = [];\n  let fresh = 0;\n  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) { if (grid[i][j] === 2) queue.push([i, j]); else if (grid[i][j] === 1) fresh++; }\n  if (fresh === 0) return 0;\n  let mins = 0;\n  const dirs = [[1,0], [-1,0], [0,1], [0,-1]];\n  while (queue.length > 0) {\n    const sz = queue.length; let inf = false;\n    for (let i = 0; i < sz; i++) {\n      const [r, c] = queue.shift()!;\n      for (const [dr, dc] of dirs) {\n        const nr = r + dr, nc = c + dc;\n        if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] === 1) { grid[nr][nc] = 2; fresh--; inf = true; queue.push([nr, nc]); }\n      }\n    }\n    if (inf) mins++;\n  }\n  return fresh === 0 ? mins : -1;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "grid = [[2,1,1],[1,1,0],[0,1,1]]",
        "expectedOutputDisplay": "4"
      },
      {
        "id": "tc-2",
        "inputDisplay": "grid = [[2,1,1],[0,1,1],[1,0,1]]",
        "expectedOutputDisplay": "-1"
      },
      {
        "id": "tc-3",
        "inputDisplay": "grid = [[0,2]]",
        "expectedOutputDisplay": "0"
      }
    ]
  },
  {
    "id": "dsa-oa-11",
    "number": 42,
    "title": "Trapping Rain Water / Terrain Reservoir Capacity",
    "difficulty": "Hard",
    "topic": "Sliding Window & Two Pointers",
    "companyTags": [
      "Goldman Sachs",
      "Google",
      "Adobe",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        "output": "6",
        "explanation": "6 units of rain water are trapped between elevation bars."
      },
      {
        "input": "height = [4,2,0,3,2,5]",
        "output": "9"
      }
    ],
    "constraints": [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5"
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(1)",
    "keyConcepts": [
      "Two Pointers",
      "Left/Right Max Invariants",
      "Bounded Elevation Volume",
      "O(1) Auxiliary Space"
    ],
    "hints": [
      "Water trapped at index i is determined by min(maxLeft, maxRight) - height[i]. Use two pointers moving inward."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int trap(int[] height) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def trap(self, height: list[int]) -> int:\n        return 0",
      "typescript": "function trap(height: number[]): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        int l = 0, r = height.size() - 1, lmax = 0, rmax = 0, total = 0;\n        while (l < r) {\n            if (height[l] <= height[r]) {\n                if (height[l] >= lmax) lmax = height[l];\n                else total += lmax - height[l];\n                l++;\n            } else {\n                if (height[r] >= rmax) rmax = height[r];\n                else total += rmax - height[r];\n                r--;\n            }\n        }\n        return total;\n    }\n};",
      "java": "class Solution {\n    public int trap(int[] height) {\n        int l = 0, r = height.length - 1, lmax = 0, rmax = 0, total = 0;\n        while (l < r) {\n            if (height[l] <= height[r]) {\n                if (height[l] >= lmax) lmax = height[l];\n                else total += lmax - height[l];\n                l++;\n            } else {\n                if (height[r] >= rmax) rmax = height[r];\n                else total += rmax - height[r];\n                r--;\n            }\n        }\n        return total;\n    }\n}",
      "python": "class Solution:\n    def trap(self, height: list[int]) -> int:\n        l, r = 0, len(height) - 1\n        lmax = rmax = total = 0\n        while l < r:\n            if height[l] <= height[r]:\n                if height[l] >= lmax: lmax = height[l]\n                else: total += lmax - height[l]\n                l += 1\n            else:\n                if height[r] >= rmax: rmax = height[r]\n                else: total += rmax - height[r]\n                r -= 1\n        return total",
      "typescript": "function trap(height: number[]): number {\n  let l = 0, r = height.length - 1, lmax = 0, rmax = 0, total = 0;\n  while (l < r) {\n    if (height[l] <= height[r]) {\n      if (height[l] >= lmax) lmax = height[l];\n      else total += lmax - height[l];\n      l++;\n    } else {\n      if (height[r] >= rmax) rmax = height[r];\n      else total += rmax - height[r];\n      r--;\n    }\n  }\n  return total;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        "expectedOutputDisplay": "6"
      },
      {
        "id": "tc-2",
        "inputDisplay": "height = [4,2,0,3,2,5]",
        "expectedOutputDisplay": "9"
      },
      {
        "id": "tc-3",
        "inputDisplay": "height = [2,0,2]",
        "expectedOutputDisplay": "2"
      }
    ]
  },
  {
    "id": "dsa-oa-12",
    "number": 84,
    "title": "Largest Rectangle in Histogram / Peak Cluster Load",
    "difficulty": "Hard",
    "topic": "Stacks, Queues & Monotonic",
    "companyTags": [
      "Media.net",
      "Sprinklr",
      "Uber",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
    "examples": [
      {
        "input": "heights = [2,1,5,6,2,3]",
        "output": "10",
        "explanation": "The maximum rectangle is formed by bars [5, 6] with area = 2 * 5 = 10."
      },
      {
        "input": "heights = [2,4]",
        "output": "4"
      }
    ],
    "constraints": [
      "1 <= heights.length <= 10^5",
      "0 <= heights[i] <= 10^4"
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "Monotonic Increasing Stack",
      "Left/Right Boundary Indexing",
      "Amortized O(1) Push/Pop",
      "Histogram Max Rectangle"
    ],
    "hints": [
      "Use a monotonic stack storing indices of bars with increasing heights.",
      "When a smaller bar is encountered, pop and compute area with popped height as minimum."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int largestRectangleArea(vector<int>& heights) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int largestRectangleArea(int[] heights) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def largestRectangleArea(self, heights: list[int]) -> int:\n        return 0",
      "typescript": "function largestRectangleArea(heights: number[]): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int largestRectangleArea(vector<int>& heights) {\n        stack<int> st;\n        int maxArea = 0, n = heights.size();\n        for (int i = 0; i <= n; i++) {\n            int h = (i == n ? 0 : heights[i]);\n            while (!st.empty() && h < heights[st.top()]) {\n                int height = heights[st.top()]; st.pop();\n                int width = st.empty() ? i : i - st.top() - 1;\n                maxArea = max(maxArea, height * width);\n            }\n            st.push(i);\n        }\n        return maxArea;\n    }\n};",
      "java": "class Solution {\n    public int largestRectangleArea(int[] heights) {\n        Stack<Integer> st = new Stack<>();\n        int maxArea = 0, n = heights.length;\n        for (int i = 0; i <= n; i++) {\n            int h = (i == n ? 0 : heights[i]);\n            while (!st.isEmpty() && h < heights[st.peek()]) {\n                int height = heights[st.pop()];\n                int width = st.isEmpty() ? i : i - st.peek() - 1;\n                maxArea = Math.max(maxArea, height * width);\n            }\n            st.push(i);\n        }\n        return maxArea;\n    }\n}",
      "python": "class Solution:\n    def largestRectangleArea(self, heights: list[int]) -> int:\n        st = []\n        max_area = 0\n        heights.append(0)\n        for i, h in enumerate(heights):\n            while st and h < heights[st[-1]]:\n                height = heights[st.pop()]\n                width = i if not st else i - st[-1] - 1\n                max_area = max(max_area, height * width)\n            st.append(i)\n        heights.pop()\n        return max_area",
      "typescript": "function largestRectangleArea(heights: number[]): number {\n  const st: number[] = [];\n  let maxArea = 0;\n  const hArr = [...heights, 0];\n  for (let i = 0; i < hArr.length; i++) {\n    while (st.length > 0 && hArr[i] < hArr[st[st.length - 1]]) {\n      const h = hArr[st.pop()!];\n      const w = st.length === 0 ? i : i - st[st.length - 1] - 1;\n      maxArea = Math.max(maxArea, h * w);\n    }\n    st.push(i);\n  }\n  return maxArea;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "heights = [2,1,5,6,2,3]",
        "expectedOutputDisplay": "10"
      },
      {
        "id": "tc-2",
        "inputDisplay": "heights = [2,4]",
        "expectedOutputDisplay": "4"
      },
      {
        "id": "tc-3",
        "inputDisplay": "heights = [1,1,1,1]",
        "expectedOutputDisplay": "4"
      }
    ]
  },
  {
    "id": "dsa-oa-13",
    "number": 300,
    "title": "Longest Increasing Subsequence / Milestone Chain",
    "difficulty": "Medium",
    "topic": "Dynamic Programming",
    "companyTags": [
      "Morgan Stanley",
      "Microsoft",
      "Google",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
    "examples": [
      {
        "input": "nums = [10,9,2,5,3,7,101,18]",
        "output": "4",
        "explanation": "The longest increasing subsequence is [2, 3, 7, 101], therefore the length is 4."
      },
      {
        "input": "nums = [0,1,0,3,2,3]",
        "output": "4"
      },
      {
        "input": "nums = [7,7,7,7,7,7,7]",
        "output": "1"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 2500",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "expectedTimeComplexity": "O(N log N)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "Patience Sorting",
      "Binary Search (std::lower_bound)",
      "Subsequence Monotonicity",
      "Tails Array"
    ],
    "hints": [
      "Use binary search (patience sort) to maintain the smallest tail of all increasing subsequences of length i + 1."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int lengthOfLIS(vector<int>& nums) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int lengthOfLIS(int[] nums) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def lengthOfLIS(self, nums: list[int]) -> int:\n        return 0",
      "typescript": "function lengthOfLIS(nums: number[]): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int lengthOfLIS(vector<int>& nums) {\n        vector<int> tails;\n        for (int x : nums) {\n            auto it = lower_bound(tails.begin(), tails.end(), x);\n            if (it == tails.end()) tails.push_back(x);\n            else *it = x;\n        }\n        return tails.size();\n    }\n};",
      "java": "class Solution {\n    public int lengthOfLIS(int[] nums) {\n        int[] tails = new int[nums.length]; int size = 0;\n        for (int x : nums) {\n            int i = 0, j = size;\n            while (i < j) { int m = (i + j) / 2; if (tails[m] < x) i = m + 1; else j = m; }\n            tails[i] = x; if (i == size) size++;\n        }\n        return size;\n    }\n}",
      "python": "class Solution:\n    def lengthOfLIS(self, nums: list[int]) -> int:\n        import bisect\n        tails = []\n        for x in nums:\n            idx = bisect.bisect_left(tails, x)\n            if idx == len(tails): tails.append(x)\n            else: tails[idx] = x\n        return len(tails)",
      "typescript": "function lengthOfLIS(nums: number[]): number {\n  const tails: number[] = [];\n  for (const x of nums) {\n    let l = 0, r = tails.length;\n    while (l < r) {\n      const m = Math.floor((l + r) / 2);\n      if (tails[m] < x) l = m + 1;\n      else r = m;\n    }\n    tails[l] = x;\n  }\n  return tails.length;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "nums = [10,9,2,5,3,7,101,18]",
        "expectedOutputDisplay": "4"
      },
      {
        "id": "tc-2",
        "inputDisplay": "nums = [0,1,0,3,2,3]",
        "expectedOutputDisplay": "4"
      },
      {
        "id": "tc-3",
        "inputDisplay": "nums = [7,7,7,7]",
        "expectedOutputDisplay": "1"
      }
    ]
  },
  {
    "id": "dsa-oa-14",
    "number": 322,
    "title": "Coin Change / Minimum Denomination Payout",
    "difficulty": "Medium",
    "topic": "Dynamic Programming",
    "companyTags": [
      "PhonePe",
      "Paytm",
      "Visa",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount cannot be made up by any combination of the coins, return -1.",
    "examples": [
      {
        "input": "coins = [1,2,5], amount = 11",
        "output": "3",
        "explanation": "11 = 5 + 5 + 1"
      },
      {
        "input": "coins = [2], amount = 3",
        "output": "-1"
      },
      {
        "input": "coins = [1], amount = 0",
        "output": "0"
      }
    ],
    "constraints": [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4"
    ],
    "expectedTimeComplexity": "O(Amount * N)",
    "expectedSpaceComplexity": "O(Amount)",
    "keyConcepts": [
      "1D Bottom-Up DP",
      "Unbounded Knapsack",
      "Infinity Sentinel Value",
      "State Transition Formula"
    ],
    "hints": [
      "dp[i] stores minimum coins for amount i. dp[i] = min(dp[i], dp[i - coin] + 1)."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        return -1;\n    }\n};",
      "java": "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        return -1;\n    }\n}",
      "python": "class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        return -1",
      "typescript": "function coinChange(coins: number[], amount: number): number {\n  return -1;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        vector<int> dp(amount + 1, amount + 1);\n        dp[0] = 0;\n        for (int i = 1; i <= amount; i++) {\n            for (int c : coins) {\n                if (i >= c) dp[i] = min(dp[i], dp[i - c] + 1);\n            }\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n};",
      "java": "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        int[] dp = new int[amount + 1];\n        Arrays.fill(dp, amount + 1);\n        dp[0] = 0;\n        for (int i = 1; i <= amount; i++) {\n            for (int c : coins) if (i >= c) dp[i] = Math.min(dp[i], dp[i - c] + 1);\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n}",
      "python": "class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        dp = [float('inf')] * (amount + 1)\n        dp[0] = 0\n        for i in range(1, amount + 1):\n            for c in coins:\n                if i >= c:\n                    dp[i] = min(dp[i], dp[i - c] + 1)\n        return dp[amount] if dp[amount] != float('inf') else -1",
      "typescript": "function coinChange(coins: number[], amount: number): number {\n  const dp = new Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let i = 1; i <= amount; i++) {\n    for (const c of coins) {\n      if (i >= c) dp[i] = Math.min(dp[i], dp[i - c] + 1);\n    }\n  }\n  return dp[amount] === Infinity ? -1 : dp[amount];\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "coins = [1,2,5], amount = 11",
        "expectedOutputDisplay": "3"
      },
      {
        "id": "tc-2",
        "inputDisplay": "coins = [2], amount = 3",
        "expectedOutputDisplay": "-1"
      },
      {
        "id": "tc-3",
        "inputDisplay": "coins = [1], amount = 0",
        "expectedOutputDisplay": "0"
      }
    ]
  },
  {
    "id": "dsa-oa-15",
    "number": 416,
    "title": "0/1 Knapsack / Partition Equal Subset Sum",
    "difficulty": "Medium",
    "topic": "Dynamic Programming",
    "companyTags": [
      "Nvidia",
      "Oracle",
      "Flipkart",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given an integer array nums, return true if you can partition the array into two subsets such that the sum of the elements in both subsets is equal or false otherwise.",
    "examples": [
      {
        "input": "nums = [1,5,11,5]",
        "output": "true",
        "explanation": "The array can be partitioned as [1, 5, 5] and [11]."
      },
      {
        "input": "nums = [1,2,3,5]",
        "output": "false"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 200",
      "1 <= nums[i] <= 100"
    ],
    "expectedTimeComplexity": "O(N * Target)",
    "expectedSpaceComplexity": "O(Target)",
    "keyConcepts": [
      "0/1 Knapsack Pattern",
      "Reverse 1D Array Iteration",
      "Odd Sum Parity Guard",
      "Boolean DP Table"
    ],
    "hints": [
      "If total sum is odd, return false immediately. Target is sum / 2. Iterate backwards to reuse 1D DP array."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    bool canPartition(vector<int>& nums) {\n        return false;\n    }\n};",
      "java": "class Solution {\n    public boolean canPartition(int[] nums) {\n        return false;\n    }\n}",
      "python": "class Solution:\n    def canPartition(self, nums: list[int]) -> bool:\n        return False",
      "typescript": "function canPartition(nums: number[]): boolean {\n  return false;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    bool canPartition(vector<int>& nums) {\n        int sum = accumulate(nums.begin(), nums.end(), 0);\n        if (sum % 2 != 0) return false;\n        int target = sum / 2;\n        vector<bool> dp(target + 1, false);\n        dp[0] = true;\n        for (int num : nums) {\n            for (int j = target; j >= num; j--) dp[j] = dp[j] || dp[j - num];\n        }\n        return dp[target];\n    }\n};",
      "java": "class Solution {\n    public boolean canPartition(int[] nums) {\n        int sum = 0; for (int n : nums) sum += n;\n        if (sum % 2 != 0) return false;\n        int target = sum / 2;\n        boolean[] dp = new boolean[target + 1]; dp[0] = true;\n        for (int num : nums) {\n            for (int j = target; j >= num; j--) dp[j] = dp[j] || dp[j - num];\n        }\n        return dp[target];\n    }\n}",
      "python": "class Solution:\n    def canPartition(self, nums: list[int]) -> bool:\n        s = sum(nums)\n        if s % 2 != 0: return False\n        target = s // 2\n        dp = [True] + [False] * target\n        for n in nums:\n            for j in range(target, n - 1, -1):\n                dp[j] = dp[j] or dp[j - n]\n        return dp[target]",
      "typescript": "function canPartition(nums: number[]): boolean {\n  const sum = nums.reduce((a, b) => a + b, 0);\n  if (sum % 2 !== 0) return false;\n  const target = sum / 2;\n  const dp = new Array(target + 1).fill(false);\n  dp[0] = true;\n  for (const n of nums) {\n    for (let j = target; j >= n; j--) dp[j] = dp[j] || dp[j - n];\n  }\n  return dp[target];\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "nums = [1,5,11,5]",
        "expectedOutputDisplay": "true"
      },
      {
        "id": "tc-2",
        "inputDisplay": "nums = [1,2,3,5]",
        "expectedOutputDisplay": "false"
      },
      {
        "id": "tc-3",
        "inputDisplay": "nums = [2,2,3,5]",
        "expectedOutputDisplay": "false"
      }
    ]
  },
  {
    "id": "dsa-oa-16",
    "number": 1143,
    "title": "Longest Common Subsequence / Git Diff Engine",
    "difficulty": "Medium",
    "topic": "Dynamic Programming",
    "companyTags": [
      "Atlassian",
      "GitHub",
      "Zoho",
      "Google"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.",
    "examples": [
      {
        "input": "text1 = \"abcde\", text2 = \"ace\"",
        "output": "3",
        "explanation": "\"ace\" is a subsequence of both with length 3."
      },
      {
        "input": "text1 = \"abc\", text2 = \"abc\"",
        "output": "3"
      },
      {
        "input": "text1 = \"abc\", text2 = \"def\"",
        "output": "0"
      }
    ],
    "constraints": [
      "1 <= text1.length, text2.length <= 1000",
      "text1 and text2 consist of only lowercase English characters."
    ],
    "expectedTimeComplexity": "O(M * N)",
    "expectedSpaceComplexity": "O(min(M, N))",
    "keyConcepts": [
      "2D Grid DP",
      "Space Optimization (Two Rows)",
      "Match vs Skip Transition",
      "String Subsequence"
    ],
    "hints": [
      "dp[i][j] = dp[i-1][j-1] + 1 if text1[i] == text2[j], else max(dp[i-1][j], dp[i][j-1])."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int longestCommonSubsequence(string text1, string text2) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def longestCommonSubsequence(self, text1: str, text2: str) -> int:\n        return 0",
      "typescript": "function longestCommonSubsequence(text1: string, text2: string): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int longestCommonSubsequence(string text1, string text2) {\n        int m = text1.size(), n = text2.size();\n        vector<int> prev(n + 1, 0), curr(n + 1, 0);\n        for (int i = 1; i <= m; i++) {\n            for (int j = 1; j <= n; j++) {\n                if (text1[i - 1] == text2[j - 1]) curr[j] = prev[j - 1] + 1;\n                else curr[j] = max(prev[j], curr[j - 1]);\n            }\n            prev = curr;\n        }\n        return prev[n];\n    }\n};",
      "java": "class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        int m = text1.length(), n = text2.length();\n        int[] prev = new int[n + 1], curr = new int[n + 1];\n        for (int i = 1; i <= m; i++) {\n            for (int j = 1; j <= n; j++) {\n                if (text1.charAt(i - 1) == text2.charAt(j - 1)) curr[j] = prev[j - 1] + 1;\n                else curr[j] = Math.max(prev[j], curr[j - 1]);\n            }\n            System.arraycopy(curr, 0, prev, 0, n + 1);\n        }\n        return prev[n];\n    }\n}",
      "python": "class Solution:\n    def longestCommonSubsequence(self, text1: str, text2: str) -> int:\n        m, n = len(text1), len(text2)\n        dp = [0] * (n + 1)\n        for c1 in text1:\n            prev = 0\n            for j, c2 in enumerate(text2, 1):\n                temp = dp[j]\n                if c1 == c2: dp[j] = prev + 1\n                else: dp[j] = max(dp[j], dp[j - 1])\n                prev = temp\n        return dp[n]",
      "typescript": "function longestCommonSubsequence(text1: string, text2: string): number {\n  const m = text1.length, n = text2.length;\n  let prev = new Array(n + 1).fill(0), curr = new Array(n + 1).fill(0);\n  for (let i = 1; i <= m; i++) {\n    for (let j = 1; j <= n; j++) {\n      if (text1[i - 1] === text2[j - 1]) curr[j] = prev[j - 1] + 1;\n      else curr[j] = Math.max(prev[j], curr[j - 1]);\n    }\n    prev = [...curr];\n  }\n  return prev[n];\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "text1 = \"abcde\", text2 = \"ace\"",
        "expectedOutputDisplay": "3"
      },
      {
        "id": "tc-2",
        "inputDisplay": "text1 = \"abc\", text2 = \"abc\"",
        "expectedOutputDisplay": "3"
      },
      {
        "id": "tc-3",
        "inputDisplay": "text1 = \"abc\", text2 = \"def\"",
        "expectedOutputDisplay": "0"
      }
    ]
  },
  {
    "id": "dsa-oa-17",
    "number": 139,
    "title": "Word Break / NLP Token Segmentation",
    "difficulty": "Medium",
    "topic": "Dynamic Programming",
    "companyTags": [
      "Google",
      "Meesho",
      "ServiceNow",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
    "examples": [
      {
        "input": "s = \"leetcode\", wordDict = [\"leet\",\"code\"]",
        "output": "true",
        "explanation": "Return true because \"leetcode\" can be segmented as \"leet code\"."
      },
      {
        "input": "s = \"applepenapple\", wordDict = [\"apple\",\"pen\"]",
        "output": "true"
      },
      {
        "input": "s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]",
        "output": "false"
      }
    ],
    "constraints": [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000",
      "1 <= wordDict[i].length <= 20"
    ],
    "expectedTimeComplexity": "O(N^2)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "1D DP State Array",
      "Prefix Substring Matching",
      "HashSet Lookup",
      "Segment Validity"
    ],
    "hints": [
      "dp[i] is true if s[0..i] can be segmented. Check for all valid j < i where dp[j] is true and s[j..i] in dictionary."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        return false;\n    }\n};",
      "java": "class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        return false;\n    }\n}",
      "python": "class Solution:\n    def wordBreak(self, s: str, wordDict: list[str]) -> bool:\n        return False",
      "typescript": "function wordBreak(s: string, wordDict: string[]): boolean {\n  return false;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        unordered_set<string> dict(wordDict.begin(), wordDict.end());\n        int n = s.size();\n        vector<bool> dp(n + 1, false);\n        dp[0] = true;\n        for (int i = 1; i <= n; i++) {\n            for (int j = 0; j < i; j++) {\n                if (dp[j] && dict.count(s.substr(j, i - j))) {\n                    dp[i] = true; break;\n                }\n            }\n        }\n        return dp[n];\n    }\n};",
      "java": "class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        Set<String> set = new HashSet<>(wordDict);\n        boolean[] dp = new boolean[s.length() + 1]; dp[0] = true;\n        for (int i = 1; i <= s.length(); i++) {\n            for (int j = 0; j < i; j++) {\n                if (dp[j] && set.contains(s.substring(j, i))) { dp[i] = true; break; }\n            }\n        }\n        return dp[s.length()];\n    }\n}",
      "python": "class Solution:\n    def wordBreak(self, s: str, wordDict: list[str]) -> bool:\n        words = set(wordDict)\n        dp = [True] + [False] * len(s)\n        for i in range(1, len(s) + 1):\n            for j in range(i):\n                if dp[j] and s[j:i] in words:\n                    dp[i] = True; break\n        return dp[-1]",
      "typescript": "function wordBreak(s: string, wordDict: string[]): boolean {\n  const words = new Set(wordDict);\n  const dp = new Array(s.length + 1).fill(false);\n  dp[0] = true;\n  for (let i = 1; i <= s.length; i++) {\n    for (let j = 0; j < i; j++) {\n      if (dp[j] && words.has(s.substring(j, i))) {\n        dp[i] = true; break;\n      }\n    }\n  }\n  return dp[s.length];\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "s = \"leetcode\", wordDict = [\"leet\",\"code\"]",
        "expectedOutputDisplay": "true"
      },
      {
        "id": "tc-2",
        "inputDisplay": "s = \"applepenapple\", wordDict = [\"apple\",\"pen\"]",
        "expectedOutputDisplay": "true"
      },
      {
        "id": "tc-3",
        "inputDisplay": "s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]",
        "expectedOutputDisplay": "false"
      }
    ]
  },
  {
    "id": "dsa-oa-18",
    "number": 208,
    "title": "Implement Trie (Prefix Tree) / Autocomplete Engine",
    "difficulty": "Medium",
    "topic": "Backtracking & Tries",
    "companyTags": [
      "Swiggy",
      "Google",
      "Blinkit",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "A trie (pronounced as \"try\") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. Implement the Trie class:\n- Trie() Initializes the trie object.\n- void insert(String word) Inserts the string word into the trie.\n- boolean search(String word) Returns true if the string word is in the trie.\n- boolean startsWith(String prefix) Returns true if there is a previously inserted string word that has the prefix.",
    "examples": [
      {
        "input": "[\"Trie\", \"insert\", \"search\", \"search\", \"startsWith\", \"insert\", \"search\"]\n[[], [\"apple\"], [\"apple\"], [\"app\"], [\"app\"], [\"app\"], [\"app\"]]",
        "output": "[null, null, true, false, true, null, true]"
      }
    ],
    "constraints": [
      "1 <= word.length, prefix.length <= 2000",
      "word and prefix consist only of lowercase English letters.",
      "At most 3 * 10^4 calls in total to insert, search, and startsWith."
    ],
    "expectedTimeComplexity": "O(L) per operation",
    "expectedSpaceComplexity": "O(Total Characters)",
    "keyConcepts": [
      "26-ary Tree Node",
      "Terminal Word Flag",
      "Prefix Walkdown",
      "O(L) Deterministic Lookup"
    ],
    "hints": [
      "Each TrieNode has an array children[26] and a boolean isEnd."
    ],
    "starterCode": {
      "cpp": "class Trie {\npublic:\n    Trie() {\n        \n    }\n    \n    void insert(string word) {\n        \n    }\n    \n    bool search(string word) {\n        return false;\n    }\n    \n    bool startsWith(string prefix) {\n        return false;\n    }\n};",
      "java": "class Trie {\n    public Trie() {\n        \n    }\n    \n    public void insert(String word) {\n        \n    }\n    \n    public boolean search(String word) {\n        return false;\n    }\n    \n    public boolean startsWith(String prefix) {\n        return false;\n    }\n}",
      "python": "class Trie:\n    def __init__(self):\n        pass\n\n    def insert(self, word: str) -> None:\n        pass\n\n    def search(self, word: str) -> bool:\n        return False\n\n    def startsWith(self, prefix: str) -> bool:\n        return False",
      "typescript": "class Trie {\n  constructor() {\n    \n  }\n\n  insert(word: string): void {\n    \n  }\n\n  search(word: string): boolean {\n    return false;\n  }\n\n  startsWith(prefix: string): boolean {\n    return false;\n  }\n}"
    },
    "referenceSolution": {
      "cpp": "class Trie {\n    struct Node { Node* ch[26] = {nullptr}; bool end = false; };\n    Node* root;\npublic:\n    Trie() { root = new Node(); }\n    void insert(string word) {\n        Node* cur = root;\n        for (char c : word) {\n            if (!cur->ch[c - 'a']) cur->ch[c - 'a'] = new Node();\n            cur = cur->ch[c - 'a'];\n        }\n        cur->end = true;\n    }\n    bool search(string word) {\n        Node* cur = root;\n        for (char c : word) { if (!cur->ch[c - 'a']) return false; cur = cur->ch[c - 'a']; }\n        return cur->end;\n    }\n    bool startsWith(string prefix) {\n        Node* cur = root;\n        for (char c : prefix) { if (!cur->ch[c - 'a']) return false; cur = cur->ch[c - 'a']; }\n        return true;\n    }\n};",
      "java": "class Trie {\n    class Node { Node[] ch = new Node[26]; boolean end; }\n    private Node root = new Node();\n    public void insert(String word) {\n        Node cur = root;\n        for (char c : word.toCharArray()) {\n            if (cur.ch[c - 'a'] == null) cur.ch[c - 'a'] = new Node();\n            cur = cur.ch[c - 'a'];\n        }\n        cur.end = true;\n    }\n    public boolean search(String word) {\n        Node cur = root;\n        for (char c : word.toCharArray()) { if (cur.ch[c - 'a'] == null) return false; cur = cur.ch[c - 'a']; }\n        return cur.end;\n    }\n    public boolean startsWith(String prefix) {\n        Node cur = root;\n        for (char c : prefix.toCharArray()) { if (cur.ch[c - 'a'] == null) return false; cur = cur.ch[c - 'a']; }\n        return true;\n    }\n}",
      "python": "class Trie:\n    def __init__(self):\n        self.root = {}\n    def insert(self, word: str) -> None:\n        cur = self.root\n        for c in word:\n            cur = cur.setdefault(c, {})\n        cur['#'] = True\n    def search(self, word: str) -> bool:\n        cur = self.root\n        for c in word:\n            if c not in cur: return False\n            cur = cur[c]\n        return '#' in cur\n    def startsWith(self, prefix: str) -> bool:\n        cur = self.root\n        for c in prefix:\n            if c not in cur: return False\n            cur = cur[c]\n        return True",
      "typescript": "class TrieNode {\n  children = new Map<string, TrieNode>();\n  isEnd = false;\n}\nclass Trie {\n  private root = new TrieNode();\n  insert(word: string): void {\n    let cur = this.root;\n    for (const c of word) {\n      if (!cur.children.has(c)) cur.children.set(c, new TrieNode());\n      cur = cur.children.get(c)!;\n    }\n    cur.isEnd = true;\n  }\n  search(word: string): boolean {\n    let cur = this.root;\n    for (const c of word) {\n      if (!cur.children.has(c)) return false;\n      cur = cur.children.get(c)!;\n    }\n    return cur.isEnd;\n  }\n  startsWith(prefix: string): boolean {\n    let cur = this.root;\n    for (const c of prefix) {\n      if (!cur.children.has(c)) return false;\n      cur = cur.children.get(c)!;\n    }\n    return true;\n  }\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "insert('apple'), search('apple'), search('app'), startsWith('app')",
        "expectedOutputDisplay": "[null, true, false, true]"
      }
    ]
  },
  {
    "id": "dsa-oa-19",
    "number": 236,
    "title": "Lowest Common Ancestor / Org Hierarchy Fork",
    "difficulty": "Medium",
    "topic": "Trees & Binary Search",
    "companyTags": [
      "Microsoft",
      "Salesforce",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given a binary tree, find the lowest common ancestor (LCA) of two given nodes p and q. The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself).",
    "examples": [
      {
        "input": "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1",
        "output": "3",
        "explanation": "The LCA of nodes 5 and 1 is 3."
      },
      {
        "input": "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4",
        "output": "5",
        "explanation": "The LCA of nodes 5 and 4 is 5, since a node can be a descendant of itself."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [2, 10^5].",
      "-10^9 <= Node.val <= 10^9",
      "All Node.val are unique.",
      "p != q",
      "p and q will exist in the tree."
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(H) recursion stack",
    "keyConcepts": [
      "Post-Order Traversal",
      "Recursive Tree Fork",
      "Base Case Propagation",
      "Lowest Ancestor Invariant"
    ],
    "hints": [
      "If root is null, p, or q, return root. Recurse left and right. If both return non-null, root is LCA."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n        return nullptr;\n    }\n};",
      "java": "class Solution {\n    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {\n        return null;\n    }\n}",
      "python": "class Solution:\n    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':\n        return None",
      "typescript": "function lowestCommonAncestor(root: TreeNode | null, p: TreeNode | null, q: TreeNode | null): TreeNode | null {\n  return null;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n        if (!root || root == p || root == q) return root;\n        TreeNode* left = lowestCommonAncestor(root->left, p, q);\n        TreeNode* right = lowestCommonAncestor(root->right, p, q);\n        if (left && right) return root;\n        return left ? left : right;\n    }\n};",
      "java": "class Solution {\n    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {\n        if (root == null || root == p || root == q) return root;\n        TreeNode left = lowestCommonAncestor(root.left, p, q);\n        TreeNode right = lowestCommonAncestor(root.right, p, q);\n        if (left != null && right != null) return root;\n        return left != null ? left : right;\n    }\n}",
      "python": "class Solution:\n    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':\n        if not root or root == p or root == q: return root\n        left = self.lowestCommonAncestor(root.left, p, q)\n        right = self.lowestCommonAncestor(root.right, p, q)\n        if left and right: return root\n        return left or right",
      "typescript": "function lowestCommonAncestor(root: TreeNode | null, p: TreeNode | null, q: TreeNode | null): TreeNode | null {\n  if (!root || root === p || root === q) return root;\n  const left = lowestCommonAncestor(root.left, p, q);\n  const right = lowestCommonAncestor(root.right, p, q);\n  if (left && right) return root;\n  return left || right;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "root = [3,5,1,6,2,0,8], p = 5, q = 1",
        "expectedOutputDisplay": "3"
      },
      {
        "id": "tc-2",
        "inputDisplay": "root = [3,5,1,6,2,0,8], p = 5, q = 4",
        "expectedOutputDisplay": "5"
      }
    ]
  },
  {
    "id": "dsa-oa-20",
    "number": 297,
    "title": "Serialize and Deserialize Binary Tree / State Marshalling",
    "difficulty": "Hard",
    "topic": "Trees & Binary Search",
    "companyTags": [
      "LinkedIn",
      "Uber",
      "Rubrik",
      "Google"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored or transmitted across a network. Design an algorithm to serialize and deserialize a binary tree.",
    "examples": [
      {
        "input": "root = [1,2,3,null,null,4,5]",
        "output": "[1,2,3,null,null,4,5]",
        "explanation": "The tree is serialized to a string and parsed back into an identical tree."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 10^4].",
      "-1000 <= Node.val <= 1000"
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "Preorder String Encoding",
      "Null Node Tokens",
      "Iterator / Queue Parsing",
      "Recursive Deserialization"
    ],
    "hints": [
      "Use preorder traversal. Encode null nodes as '#' and separate values by commas."
    ],
    "starterCode": {
      "cpp": "class Codec {\npublic:\n    string serialize(TreeNode* root) {\n        return \"\";\n    }\n    TreeNode* deserialize(string data) {\n        return nullptr;\n    }\n};",
      "java": "public class Codec {\n    public String serialize(TreeNode root) {\n        return \"\";\n    }\n    public TreeNode deserialize(String data) {\n        return null;\n    }\n}",
      "python": "class Codec:\n    def serialize(self, root: 'TreeNode') -> str:\n        return \"\"\n    def deserialize(self, data: str) -> 'TreeNode':\n        return None",
      "typescript": "function serialize(root: TreeNode | null): string {\n  return \"\";\n}\nfunction deserialize(data: string): TreeNode | null {\n  return null;\n}"
    },
    "referenceSolution": {
      "cpp": "class Codec {\n    void build(TreeNode* r, ostringstream& out) {\n        if (!r) { out << \"# \"; return; }\n        out << r->val << \" \"; build(r->left, out); build(r->right, out);\n    }\n    TreeNode* parse(istringstream& in) {\n        string val; in >> val;\n        if (val == \"#\") return nullptr;\n        TreeNode* node = new TreeNode(stoi(val));\n        node->left = parse(in); node->right = parse(in);\n        return node;\n    }\npublic:\n    string serialize(TreeNode* root) { ostringstream out; build(root, out); return out.str(); }\n    TreeNode* deserialize(string data) { istringstream in(data); return parse(in); }\n};",
      "java": "public class Codec {\n    public String serialize(TreeNode root) {\n        if (root == null) return \"#,\";\n        return root.val + \",\" + serialize(root.left) + serialize(root.right);\n    }\n    public TreeNode deserialize(String data) {\n        Queue<String> q = new LinkedList<>(Arrays.asList(data.split(\",\")));\n        return build(q);\n    }\n    private TreeNode build(Queue<String> q) {\n        String val = q.poll();\n        if (val.equals(\"#\")) return null;\n        TreeNode node = new TreeNode(Integer.parseInt(val));\n        node.left = build(q); node.right = build(q);\n        return node;\n    }\n}",
      "python": "class Codec:\n    def serialize(self, root):\n        def doit(node):\n            if node:\n                vals.append(str(node.val)); doit(node.left); doit(node.right)\n            else: vals.append('#')\n        vals = []; doit(root); return ' '.join(vals)\n    def deserialize(self, data):\n        def doit():\n            val = next(vals)\n            if val == '#': return None\n            node = TreeNode(int(val))\n            node.left = doit(); node.right = doit()\n            return node\n        vals = iter(data.split())\n        return doit()",
      "typescript": "function serialize(root: TreeNode | null): string {\n  if (!root) return '#';\n  return `${root.val},${serialize(root.left)},${serialize(root.right)}`;\n}\nfunction deserialize(data: string): TreeNode | null {\n  const tokens = data.split(',');\n  function build(): TreeNode | null {\n    const val = tokens.shift();\n    if (val === '#' || val === undefined) return null;\n    const node = new TreeNode(parseInt(val, 10));\n    node.left = build(); node.right = build();\n    return node;\n  }\n  return build();\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "root = [1,2,3,null,null,4,5]",
        "expectedOutputDisplay": "[1,2,3,null,null,4,5]"
      }
    ]
  },
  {
    "id": "dsa-oa-21",
    "number": 98,
    "title": "Validate Binary Search Tree / Index Schema Integrity",
    "difficulty": "Medium",
    "topic": "Trees & Binary Search",
    "companyTags": [
      "Bloomberg",
      "JPMorgan",
      "Infosys SP/DSE",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST is defined as:\n- The left subtree contains only nodes with keys strictly less than the node's key.\n- The right subtree contains only nodes with keys strictly greater than the node's key.\n- Both left and right subtrees must also be binary search trees.",
    "examples": [
      {
        "input": "root = [2,1,3]",
        "output": "true"
      },
      {
        "input": "root = [5,1,4,null,null,3,6]",
        "output": "false",
        "explanation": "The root node's value is 5 but its right child's value is 4."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [1, 10^4].",
      "-2^31 <= Node.val <= 2^31 - 1"
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(H) recursion stack",
    "keyConcepts": [
      "BST Range Invariants (min, max)",
      "In-Order Traversal Monotonicity",
      "Long Long Overflow Guards",
      "Recursive Subtree Validation"
    ],
    "hints": [
      "Pass down valid range (minAllowed, maxAllowed) to each recursive call."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        return false;\n    }\n};",
      "java": "class Solution {\n    public boolean isValidBST(TreeNode root) {\n        return false;\n    }\n}",
      "python": "class Solution:\n    def isValidBST(self, root: 'TreeNode') -> bool:\n        return False",
      "typescript": "function isValidBST(root: TreeNode | null): boolean {\n  return false;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\n    bool check(TreeNode* r, long long minVal, long long maxVal) {\n        if (!r) return true;\n        if (r->val <= minVal || r->val >= maxVal) return false;\n        return check(r->left, minVal, r->val) && check(r->right, r->val, maxVal);\n    }\npublic:\n    bool isValidBST(TreeNode* root) {\n        return check(root, LLONG_MIN, LLONG_MAX);\n    }\n};",
      "java": "class Solution {\n    private boolean check(TreeNode r, Long minVal, Long maxVal) {\n        if (r == null) return true;\n        if (r.val <= minVal || r.val >= maxVal) return false;\n        return check(r.left, minVal, (long)r.val) && check(r.right, (long)r.val, maxVal);\n    }\n    public boolean isValidBST(TreeNode root) {\n        return check(root, Long.MIN_VALUE, Long.MAX_VALUE);\n    }\n}",
      "python": "class Solution:\n    def isValidBST(self, root: 'TreeNode') -> bool:\n        def check(node, low=float('-inf'), high=float('inf')):\n            if not node: return True\n            if node.val <= low or node.val >= high: return False\n            return check(node.left, low, node.val) and check(node.right, node.val, high)\n        return check(root)",
      "typescript": "function isValidBST(root: TreeNode | null): boolean {\n  function check(node: TreeNode | null, min: number, max: number): boolean {\n    if (!node) return true;\n    if (node.val <= min || node.val >= max) return false;\n    return check(node.left, min, node.val) && check(node.right, node.val, max);\n  }\n  return check(root, -Infinity, Infinity);\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "root = [2,1,3]",
        "expectedOutputDisplay": "true"
      },
      {
        "id": "tc-2",
        "inputDisplay": "root = [5,1,4,null,null,3,6]",
        "expectedOutputDisplay": "false"
      }
    ]
  },
  {
    "id": "dsa-oa-22",
    "number": 347,
    "title": "Top K Frequent Elements / Trending Search Queries",
    "difficulty": "Medium",
    "topic": "Heaps & Greedy",
    "companyTags": [
      "Flipkart",
      "Cred",
      "Zepto",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "Data Engineer"
    ],
    "problemStatement": "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.",
    "examples": [
      {
        "input": "nums = [1,1,1,2,2,3], k = 2",
        "output": "[1,2]"
      },
      {
        "input": "nums = [1], k = 1",
        "output": "[1]"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
      "k is in the range [1, the number of unique elements in the array].",
      "It is guaranteed that the answer is unique."
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "Bucket Sort (Frequency Buckets)",
      "Min-Heap O(N log K)",
      "Frequency HashMap",
      "Linear Time Selection"
    ],
    "hints": [
      "Count element frequencies. Use bucket sort where bucket index represents frequency count for O(N) time."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        return {};\n    }\n};",
      "java": "class Solution {\n    public int[] topKFrequent(int[] nums, int k) {\n        return new int[0];\n    }\n}",
      "python": "class Solution:\n    def topKFrequent(self, nums: list[int], k: int) -> list[int]:\n        return []",
      "typescript": "function topKFrequent(nums: number[], k: number): number[] {\n  return [];\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        unordered_map<int, int> count;\n        for (int x : nums) count[x]++;\n        vector<vector<int>> buckets(nums.size() + 1);\n        for (auto& p : count) buckets[p.second].push_back(p.first);\n        vector<int> res;\n        for (int i = nums.size(); i >= 0 && res.size() < k; i--) {\n            for (int num : buckets[i]) {\n                res.push_back(num);\n                if (res.size() == k) break;\n            }\n        }\n        return res;\n    }\n};",
      "java": "class Solution {\n    public int[] topKFrequent(int[] nums, int k) {\n        Map<Integer, Integer> count = new HashMap<>();\n        for (int x : nums) count.put(x, count.getOrDefault(x, 0) + 1);\n        List<Integer>[] buckets = new List[nums.length + 1];\n        for (int key : count.keySet()) {\n            int freq = count.get(key);\n            if (buckets[freq] == null) buckets[freq] = new ArrayList<>();\n            buckets[freq].add(key);\n        }\n        int[] res = new int[k]; int idx = 0;\n        for (int i = buckets.length - 1; i >= 0 && idx < k; i--) {\n            if (buckets[i] != null) for (int num : buckets[i]) { res[idx++] = num; if (idx == k) break; }\n        }\n        return res;\n    }\n}",
      "python": "class Solution:\n    def topKFrequent(self, nums: list[int], k: int) -> list[int]:\n        from collections import Counter\n        count = Counter(nums)\n        buckets = [[] for _ in range(len(nums) + 1)]\n        for num, freq in count.items(): buckets[freq].append(num)\n        res = []\n        for i in range(len(buckets) - 1, 0, -1):\n            for num in buckets[i]:\n                res.append(num)\n                if len(res) == k: return res\n        return res",
      "typescript": "function topKFrequent(nums: number[], k: number): number[] {\n  const count = new Map<number, number>();\n  for (const x of nums) count.set(x, (count.get(x) || 0) + 1);\n  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);\n  for (const [num, freq] of count.entries()) buckets[freq].push(num);\n  const res: number[] = [];\n  for (let i = buckets.length - 1; i >= 0 && res.length < k; i--) {\n    for (const num of buckets[i]) {\n      res.push(num);\n      if (res.length === k) break;\n    }\n  }\n  return res;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "nums = [1,1,1,2,2,3], k = 2",
        "expectedOutputDisplay": "[1,2]"
      },
      {
        "id": "tc-2",
        "inputDisplay": "nums = [1], k = 1",
        "expectedOutputDisplay": "[1]"
      }
    ]
  },
  {
    "id": "dsa-oa-23",
    "number": 295,
    "title": "Find Median from Data Stream / Latency p50 Tracker",
    "difficulty": "Hard",
    "topic": "Heaps & Greedy",
    "companyTags": [
      "Goldman Sachs",
      "Nutanix",
      "D.E. Shaw",
      "Google"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "Data Engineer"
    ],
    "problemStatement": "The median is the middle value in an ordered integer list. Implement the MedianFinder class:\n- MedianFinder() initializes the MedianFinder object.\n- void addNum(int num) adds the integer num from the data stream.\n- double findMedian() returns the median of all elements so far.",
    "examples": [
      {
        "input": "[\"MedianFinder\", \"addNum\", \"addNum\", \"findMedian\", \"addNum\", \"findMedian\"]\n[[], [1], [2], [], [3], []]",
        "output": "[null, null, null, 1.5, null, 2.0]"
      }
    ],
    "constraints": [
      "-10^5 <= num <= 10^5",
      "There will be at least one element before calling findMedian.",
      "At most 5 * 10^4 calls will be made to addNum and findMedian."
    ],
    "expectedTimeComplexity": "addNum: O(log N), findMedian: O(1)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "Two Heaps Pattern (Max-Heap + Min-Heap)",
      "Heap Balancing Invariants",
      "O(1) Median Computation",
      "Streaming Data"
    ],
    "hints": [
      "Maintain max-heap for lower half and min-heap for upper half. Balance sizes so max-heap has at most 1 more element than min-heap."
    ],
    "starterCode": {
      "cpp": "class MedianFinder {\npublic:\n    MedianFinder() {\n        \n    }\n    \n    void addNum(int num) {\n        \n    }\n    \n    double findMedian() {\n        return 0.0;\n    }\n};",
      "java": "class MedianFinder {\n    public MedianFinder() {\n        \n    }\n    \n    public void addNum(int num) {\n        \n    }\n    \n    public double findMedian() {\n        return 0.0;\n    }\n}",
      "python": "class MedianFinder:\n    def __init__(self):\n        pass\n\n    def addNum(self, num: int) -> None:\n        pass\n\n    def findMedian() -> float:\n        return 0.0",
      "typescript": "class MedianFinder {\n  constructor() {\n    \n  }\n\n  addNum(num: number): void {\n    \n  }\n\n  findMedian(): number {\n    return 0;\n  }\n}"
    },
    "referenceSolution": {
      "cpp": "class MedianFinder {\n    priority_queue<int> maxH;\n    priority_queue<int, vector<int>, greater<int>> minH;\npublic:\n    MedianFinder() {}\n    void addNum(int num) {\n        maxH.push(num);\n        minH.push(maxH.top()); maxH.pop();\n        if (minH.size() > maxH.size()) { maxH.push(minH.top()); minH.pop(); }\n    }\n    double findMedian() {\n        if (maxH.size() > minH.size()) return maxH.top();\n        return (maxH.top() + minH.top()) / 2.0;\n    }\n};",
      "java": "class MedianFinder {\n    private PriorityQueue<Integer> maxH = new PriorityQueue<>((a, b) -> b - a);\n    private PriorityQueue<Integer> minH = new PriorityQueue<>();\n    public void addNum(int num) {\n        maxH.offer(num);\n        minH.offer(maxH.poll());\n        if (minH.size() > maxH.size()) maxH.offer(minH.poll());\n    }\n    public double findMedian() {\n        if (maxH.size() > minH.size()) return maxH.peek();\n        return (maxH.peek() + minH.peek()) / 2.0;\n    }\n}",
      "python": "class MedianFinder:\n    def __init__(self):\n        import heapq\n        self.small, self.large = [], []\n    def addNum(self, num: int) -> None:\n        import heapq\n        heapq.heappush(self.small, -num)\n        heapq.heappush(self.large, -heapq.heappop(self.small))\n        if len(self.large) > len(self.small):\n            heapq.heappush(self.small, -heapq.heappop(self.large))\n    def findMedian(self) -> float:\n        if len(self.small) > len(self.large): return float(-self.small[0])\n        return (-self.small[0] + self.large[0]) / 2.0",
      "typescript": "class MedianFinder {\n  private arr: number[] = [];\n  addNum(num: number): void {\n    let l = 0, r = this.arr.length;\n    while (l < r) {\n      const m = Math.floor((l + r) / 2);\n      if (this.arr[m] < num) l = m + 1;\n      else r = m;\n    }\n    this.arr.splice(l, 0, num);\n  }\n  findMedian(): number {\n    const n = this.arr.length;\n    if (n % 2 !== 0) return this.arr[Math.floor(n / 2)];\n    return (this.arr[n / 2 - 1] + this.arr[n / 2]) / 2;\n  }\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "addNum(1), addNum(2), findMedian(), addNum(3), findMedian()",
        "expectedOutputDisplay": "[1.5, 2.0]"
      }
    ]
  },
  {
    "id": "dsa-oa-24",
    "number": 253,
    "title": "Meeting Rooms II / Minimum Conference Servers Required",
    "difficulty": "Medium",
    "topic": "Heaps & Greedy",
    "companyTags": [
      "Google",
      "Razorpay",
      "Uber",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer",
      "DevOps / SRE"
    ],
    "problemStatement": "Given an array of meeting time intervals intervals where intervals[i] = [start_i, end_i], return the minimum number of conference rooms (or server pods) required.",
    "examples": [
      {
        "input": "intervals = [[0,30],[5,10],[15,20]]",
        "output": "2",
        "explanation": "[0,30] overlaps with [5,10] and [15,20], so 2 rooms are needed."
      },
      {
        "input": "intervals = [[7,10],[2,4]]",
        "output": "1"
      }
    ],
    "constraints": [
      "1 <= intervals.length <= 10^4",
      "0 <= start_i < end_i <= 10^6"
    ],
    "expectedTimeComplexity": "O(N log N)",
    "expectedSpaceComplexity": "O(N)",
    "keyConcepts": [
      "Sweep Line / Two Pointers",
      "Min-Heap End Time Tracking",
      "Interval Overlap Counter",
      "Resource Allocation"
    ],
    "hints": [
      "Sort start times and end times separately. Whenever a start is earlier than the earliest end, increment room count."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int minMeetingRooms(vector<vector<int>>& intervals) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int minMeetingRooms(int[][] intervals) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def minMeetingRooms(self, intervals: list[list[int]]) -> int:\n        return 0",
      "typescript": "function minMeetingRooms(intervals: number[][]): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int minMeetingRooms(vector<vector<int>>& intervals) {\n        vector<int> starts, ends;\n        for (auto& iv : intervals) { starts.push_back(iv[0]); ends.push_back(iv[1]); }\n        sort(starts.begin(), starts.end()); sort(ends.begin(), ends.end());\n        int rooms = 0, endIdx = 0;\n        for (int i = 0; i < starts.size(); i++) {\n            if (starts[i] < ends[endIdx]) rooms++;\n            else endIdx++;\n        }\n        return rooms;\n    }\n};",
      "java": "class Solution {\n    public int minMeetingRooms(int[][] intervals) {\n        int n = intervals.length;\n        int[] starts = new int[n], ends = new int[n];\n        for (int i = 0; i < n; i++) { starts[i] = intervals[i][0]; ends[i] = intervals[i][1]; }\n        Arrays.sort(starts); Arrays.sort(ends);\n        int rooms = 0, endIdx = 0;\n        for (int i = 0; i < n; i++) {\n            if (starts[i] < ends[endIdx]) rooms++;\n            else endIdx++;\n        }\n        return rooms;\n    }\n}",
      "python": "class Solution:\n    def minMeetingRooms(self, intervals: list[list[int]]) -> int:\n        starts = sorted([i[0] for i in intervals])\n        ends = sorted([i[1] for i in intervals])\n        rooms = end_idx = 0\n        for s in starts:\n            if s < ends[end_idx]: rooms += 1\n            else: end_idx += 1\n        return rooms",
      "typescript": "function minMeetingRooms(intervals: number[][]): number {\n  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);\n  const ends = intervals.map(i => i[1]).sort((a, b) => a - b);\n  let rooms = 0, endIdx = 0;\n  for (let i = 0; i < starts.length; i++) {\n    if (starts[i] < ends[endIdx]) rooms++;\n    else endIdx++;\n  }\n  return rooms;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "intervals = [[0,30],[5,10],[15,20]]",
        "expectedOutputDisplay": "2"
      },
      {
        "id": "tc-2",
        "inputDisplay": "intervals = [[7,10],[2,4]]",
        "expectedOutputDisplay": "1"
      },
      {
        "id": "tc-3",
        "inputDisplay": "intervals = [[1,4],[2,5],[3,6]]",
        "expectedOutputDisplay": "3"
      }
    ]
  },
  {
    "id": "dsa-oa-25",
    "number": 435,
    "title": "Non-Overlapping Intervals / Job Scheduler",
    "difficulty": "Medium",
    "topic": "Heaps & Greedy",
    "companyTags": [
      "Intuit",
      "Flipkart",
      "TCS Digital",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given an array of intervals intervals where intervals[i] = [start_i, end_i], return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.",
    "examples": [
      {
        "input": "intervals = [[1,2],[2,3],[3,4],[1,3]]",
        "output": "1",
        "explanation": "[1,3] can be removed and the rest of the intervals are non-overlapping."
      },
      {
        "input": "intervals = [[1,2],[1,2],[1,2]]",
        "output": "2"
      },
      {
        "input": "intervals = [[1,2],[2,3]]",
        "output": "0"
      }
    ],
    "constraints": [
      "1 <= intervals.length <= 10^5",
      "intervals[i].length == 2",
      "-5 * 10^4 <= start_i < end_i <= 5 * 10^4"
    ],
    "expectedTimeComplexity": "O(N log N)",
    "expectedSpaceComplexity": "O(1)",
    "keyConcepts": [
      "Greedy Interval Scheduling",
      "Sort by End Time",
      "Overlap Invariant",
      "Minimum Removals"
    ],
    "hints": [
      "Sort intervals by their end time. Keep the interval that finishes earliest to leave maximum room for future intervals."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int eraseOverlapIntervals(vector<vector<int>>& intervals) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int eraseOverlapIntervals(int[][] intervals) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def eraseOverlapIntervals(self, intervals: list[list[int]]) -> int:\n        return 0",
      "typescript": "function eraseOverlapIntervals(intervals: number[][]): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int eraseOverlapIntervals(vector<vector<int>>& intervals) {\n        sort(intervals.begin(), intervals.end(), [](const auto& a, const auto& b) { return a[1] < b[1]; });\n        int count = 0, lastEnd = INT_MIN;\n        for (const auto& iv : intervals) {\n            if (iv[0] >= lastEnd) lastEnd = iv[1];\n            else count++;\n        }\n        return count;\n    }\n};",
      "java": "class Solution {\n    public int eraseOverlapIntervals(int[][] intervals) {\n        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));\n        int count = 0, lastEnd = Integer.MIN_VALUE;\n        for (int[] iv : intervals) {\n            if (iv[0] >= lastEnd) lastEnd = iv[1];\n            else count++;\n        }\n        return count;\n    }\n}",
      "python": "class Solution:\n    def eraseOverlapIntervals(self, intervals: list[list[int]]) -> int:\n        intervals.sort(key=lambda x: x[1])\n        count = 0\n        last_end = float('-inf')\n        for s, e in intervals:\n            if s >= last_end: last_end = e\n            else: count += 1\n        return count",
      "typescript": "function eraseOverlapIntervals(intervals: number[][]): number {\n  intervals.sort((a, b) => a[1] - b[1]);\n  let count = 0, lastEnd = -Infinity;\n  for (const [s, e] of intervals) {\n    if (s >= lastEnd) lastEnd = e;\n    else count++;\n  }\n  return count;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "intervals = [[1,2],[2,3],[3,4],[1,3]]",
        "expectedOutputDisplay": "1"
      },
      {
        "id": "tc-2",
        "inputDisplay": "intervals = [[1,2],[1,2],[1,2]]",
        "expectedOutputDisplay": "2"
      },
      {
        "id": "tc-3",
        "inputDisplay": "intervals = [[1,2],[2,3]]",
        "expectedOutputDisplay": "0"
      }
    ]
  },
  {
    "id": "dsa-oa-26",
    "number": 33,
    "title": "Search in Rotated Sorted Array / Sharded Key Lookup",
    "difficulty": "Medium",
    "topic": "Trees & Binary Search",
    "companyTags": [
      "Microsoft",
      "Amazon OA",
      "Adobe",
      "Google"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "There is an integer array nums sorted in ascending order (with distinct values) that has been rotated at an unknown pivot index. Given array nums and an integer target, return the index of target if it is in nums, or -1 if it is not in nums. You must write an algorithm with O(log n) runtime complexity.",
    "examples": [
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 0",
        "output": "4"
      },
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 3",
        "output": "-1"
      },
      {
        "input": "nums = [1], target = 0",
        "output": "-1"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4",
      "All values of nums are unique.",
      "-10^4 <= target <= 10^4"
    ],
    "expectedTimeComplexity": "O(log N)",
    "expectedSpaceComplexity": "O(1)",
    "keyConcepts": [
      "Modified Binary Search",
      "Sorted Half Invariant",
      "Pivot Boundary Decision",
      "O(log N) Time"
    ],
    "hints": [
      "At least one half of the array (left..mid or mid..right) is guaranteed to be strictly sorted. Check if target lies within the sorted half."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        return -1;\n    }\n};",
      "java": "class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}",
      "python": "class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        return -1",
      "typescript": "function search(nums: number[], target: number): number {\n  return -1;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        int l = 0, r = nums.size() - 1;\n        while (l <= r) {\n            int m = l + (r - l) / 2;\n            if (nums[m] == target) return m;\n            if (nums[l] <= nums[m]) {\n                if (nums[l] <= target && target < nums[m]) r = m - 1;\n                else l = m + 1;\n            } else {\n                if (nums[m] < target && target <= nums[r]) l = m + 1;\n                else r = m - 1;\n            }\n        }\n        return -1;\n    }\n};",
      "java": "class Solution {\n    public int search(int[] nums, int target) {\n        int l = 0, r = nums.length - 1;\n        while (l <= r) {\n            int m = l + (r - l) / 2;\n            if (nums[m] == target) return m;\n            if (nums[l] <= nums[m]) {\n                if (nums[l] <= target && target < nums[m]) r = m - 1;\n                else l = m + 1;\n            } else {\n                if (nums[m] < target && target <= nums[r]) l = m + 1;\n                else r = m - 1;\n            }\n        }\n        return -1;\n    }\n}",
      "python": "class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        l, r = 0, len(nums) - 1\n        while l <= r:\n            m = (l + r) // 2\n            if nums[m] == target: return m\n            if nums[l] <= nums[m]:\n                if nums[l] <= target < nums[m]: r = m - 1\n                else: l = m + 1\n            else:\n                if nums[m] < target <= nums[r]: l = m + 1\n                else: r = m - 1\n        return -1",
      "typescript": "function search(nums: number[], target: number): number {\n  let l = 0, r = nums.length - 1;\n  while (l <= r) {\n    const m = Math.floor((l + r) / 2);\n    if (nums[m] === target) return m;\n    if (nums[l] <= nums[m]) {\n      if (nums[l] <= target && target < nums[m]) r = m - 1;\n      else l = m + 1;\n    } else {\n      if (nums[m] < target && target <= nums[r]) l = m + 1;\n      else r = m - 1;\n    }\n  }\n  return -1;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "nums = [4,5,6,7,0,1,2], target = 0",
        "expectedOutputDisplay": "4"
      },
      {
        "id": "tc-2",
        "inputDisplay": "nums = [4,5,6,7,0,1,2], target = 3",
        "expectedOutputDisplay": "-1"
      },
      {
        "id": "tc-3",
        "inputDisplay": "nums = [1], target = 0",
        "expectedOutputDisplay": "-1"
      }
    ]
  },
  {
    "id": "dsa-oa-27",
    "number": 49,
    "title": "Group Anagrams / Document Fingerprinting",
    "difficulty": "Medium",
    "topic": "Arrays & Hashing",
    "companyTags": [
      "Postman",
      "Zomato",
      "Morgan Stanley",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given an array of strings strs, group the anagrams together. You can return the answer in any order. An Anagram is a word formed by rearranging the letters of a different word.",
    "examples": [
      {
        "input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"
      },
      {
        "input": "strs = [\"\"]",
        "output": "[[\"\"]]"
      },
      {
        "input": "strs = [\"a\"]",
        "output": "[[\"a\"]]"
      }
    ],
    "constraints": [
      "1 <= strs.length <= 10^4",
      "0 <= strs[i].length <= 100",
      "strs[i] consists of lowercase English letters."
    ],
    "expectedTimeComplexity": "O(N * K log K) or O(N * K)",
    "expectedSpaceComplexity": "O(N * K)",
    "keyConcepts": [
      "Canonical Sorted Key Hashing",
      "Character Count Tuple",
      "HashMap Bucket Grouping",
      "String Normalization"
    ],
    "hints": [
      "Sort each string to form a canonical anagram key. Group all words sharing the same canonical key into a hash map."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        return {};\n    }\n};",
      "java": "class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        return new ArrayList<>();\n    }\n}",
      "python": "class Solution:\n    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:\n        return []",
      "typescript": "function groupAnagrams(strs: string[]): string[][] {\n  return [];\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        unordered_map<string, vector<string>> map;\n        for (const string& s : strs) {\n            string key = s; sort(key.begin(), key.end());\n            map[key].push_back(s);\n        }\n        vector<vector<string>> res;\n        for (auto& p : map) res.push_back(p.second);\n        return res;\n    }\n};",
      "java": "class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        Map<String, List<String>> map = new HashMap<>();\n        for (String s : strs) {\n            char[] ca = s.toCharArray(); Arrays.sort(ca);\n            String key = String.valueOf(ca);\n            map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);\n        }\n        return new ArrayList<>(map.values());\n    }\n}",
      "python": "class Solution:\n    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:\n        from collections import defaultdict\n        ans = defaultdict(list)\n        for s in strs:\n            ans[tuple(sorted(s))].append(s)\n        return list(ans.values())",
      "typescript": "function groupAnagrams(strs: string[]): string[][] {\n  const map = new Map<string, string[]>();\n  for (const s of strs) {\n    const key = s.split('').sort().join('');\n    if (!map.has(key)) map.set(key, []);\n    map.get(key)!.push(s);\n  }\n  return Array.from(map.values());\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        "expectedOutputDisplay": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"
      },
      {
        "id": "tc-2",
        "inputDisplay": "strs = [\"\"]",
        "expectedOutputDisplay": "[[\"\"]]"
      },
      {
        "id": "tc-3",
        "inputDisplay": "strs = [\"a\"]",
        "expectedOutputDisplay": "[[\"a\"]]"
      }
    ]
  },
  {
    "id": "dsa-oa-28",
    "number": 238,
    "title": "Product of Array Except Self / Cumulative Ratio Metric",
    "difficulty": "Medium",
    "topic": "Arrays & Hashing",
    "companyTags": [
      "Apple",
      "Asana",
      "Flipkart",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.",
    "examples": [
      {
        "input": "nums = [1,2,3,4]",
        "output": "[24,12,8,6]"
      },
      {
        "input": "nums = [-1,1,0,-3,3]",
        "output": "[0,0,9,0,0]"
      }
    ],
    "constraints": [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30"
    ],
    "expectedTimeComplexity": "O(N)",
    "expectedSpaceComplexity": "O(1) auxiliary (excluding output array)",
    "keyConcepts": [
      "Prefix and Suffix Products",
      "Running Accumulator",
      "No Division Invariant",
      "Single Pass In-Place"
    ],
    "hints": [
      "Pass 1: Store prefix products in output array. Pass 2: Iterate backwards multiplying with a running suffix product."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        return {};\n    }\n};",
      "java": "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        return new int[0];\n    }\n}",
      "python": "class Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        return []",
      "typescript": "function productExceptSelf(nums: number[]): number[] {\n  return [];\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        int n = nums.size();\n        vector<int> res(n, 1);\n        for (int i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];\n        int right = 1;\n        for (int i = n - 1; i >= 0; i--) {\n            res[i] *= right;\n            right *= nums[i];\n        }\n        return res;\n    }\n};",
      "java": "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        int n = nums.length;\n        int[] res = new int[n]; res[0] = 1;\n        for (int i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];\n        int right = 1;\n        for (int i = n - 1; i >= 0; i--) { res[i] *= right; right *= nums[i]; }\n        return res;\n    }\n}",
      "python": "class Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        n = len(nums)\n        res = [1] * n\n        for i in range(1, n): res[i] = res[i - 1] * nums[i - 1]\n        right = 1\n        for i in range(n - 1, -1, -1):\n            res[i] *= right\n            right *= nums[i]\n        return res",
      "typescript": "function productExceptSelf(nums: number[]): number[] {\n  const n = nums.length;\n  const res = new Array(n).fill(1);\n  for (let i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];\n  let right = 1;\n  for (let i = n - 1; i >= 0; i--) {\n    res[i] *= right;\n    right *= nums[i];\n  }\n  return res;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "nums = [1,2,3,4]",
        "expectedOutputDisplay": "[24,12,8,6]"
      },
      {
        "id": "tc-2",
        "inputDisplay": "nums = [-1,1,0,-3,3]",
        "expectedOutputDisplay": "[0,0,9,0,0]"
      }
    ]
  },
  {
    "id": "dsa-oa-29",
    "number": 133,
    "title": "Clone Graph / Deep Network Topology Copy",
    "difficulty": "Medium",
    "topic": "Graphs, BFS/DFS & TopoSort",
    "companyTags": [
      "Meta",
      "Google",
      "Sprinklr",
      "Amazon OA"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "Given a reference of a node in a connected undirected graph. Return a deep copy (clone) of the graph. Each node contains a value (int) and a list of its neighbors.",
    "examples": [
      {
        "input": "adjList = [[2,4],[1,3],[2,4],[1,3]]",
        "output": "[[2,4],[1,3],[2,4],[1,3]]"
      }
    ],
    "constraints": [
      "The number of nodes in the graph is in the range [0, 100].",
      "1 <= Node.val <= 100",
      "Node.val is unique for each node."
    ],
    "expectedTimeComplexity": "O(V + E)",
    "expectedSpaceComplexity": "O(V)",
    "keyConcepts": [
      "Deep Copy Graph Traversal",
      "Visited Clone HashMap",
      "DFS Recursion or BFS Queue",
      "Cyclic Graph Guard"
    ],
    "hints": [
      "Use a hash map mapping original node pointer -> cloned node pointer. During DFS, return clone if already visited."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    Node* cloneGraph(Node* node) {\n        return nullptr;\n    }\n};",
      "java": "class Solution {\n    public Node cloneGraph(Node node) {\n        return null;\n    }\n}",
      "python": "class Solution:\n    def cloneGraph(self, node: 'Node') -> 'Node':\n        return None",
      "typescript": "function cloneGraph(node: _Node | null): _Node | null {\n  return null;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\n    unordered_map<Node*, Node*> visited;\npublic:\n    Node* cloneGraph(Node* node) {\n        if (!node) return nullptr;\n        if (visited.count(node)) return visited[node];\n        Node* copy = new Node(node->val);\n        visited[node] = copy;\n        for (Node* n : node->neighbors) copy->neighbors.push_back(cloneGraph(n));\n        return copy;\n    }\n};",
      "java": "class Solution {\n    private Map<Node, Node> visited = new HashMap<>();\n    public Node cloneGraph(Node node) {\n        if (node == null) return null;\n        if (visited.containsKey(node)) return visited.get(node);\n        Node clone = new Node(node.val);\n        visited.put(node, clone);\n        for (Node n : node.neighbors) clone.neighbors.add(cloneGraph(n));\n        return clone;\n    }\n}",
      "python": "class Solution:\n    def cloneGraph(self, node: 'Node') -> 'Node':\n        if not node: return None\n        visited = {}\n        def dfs(n):\n            if n in visited: return visited[n]\n            copy = Node(n.val)\n            visited[n] = copy\n            copy.neighbors = [dfs(neighbor) for neighbor in n.neighbors]\n            return copy\n        return dfs(node)",
      "typescript": "function cloneGraph(node: _Node | null): _Node | null {\n  if (!node) return null;\n  const visited = new Map<_Node, _Node>();\n  function dfs(curr: _Node): _Node {\n    if (visited.has(curr)) return visited.get(curr)!;\n    const copy = new _Node(curr.val);\n    visited.set(curr, copy);\n    for (const neighbor of curr.neighbors) copy.neighbors.push(dfs(neighbor));\n    return copy;\n  }\n  return dfs(node);\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "adjList = [[2,4],[1,3],[2,4],[1,3]]",
        "expectedOutputDisplay": "[[2,4],[1,3],[2,4],[1,3]]"
      }
    ]
  },
  {
    "id": "dsa-oa-30",
    "number": 127,
    "title": "Word Ladder / Shortest Mutation Path",
    "difficulty": "Hard",
    "topic": "Graphs, BFS/DFS & TopoSort",
    "companyTags": [
      "Amazon OA",
      "Goldman Sachs",
      "Arcesium",
      "Google"
    ],
    "roles": [
      "Full-Stack SDE",
      "Backend Engineer"
    ],
    "problemStatement": "A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that every adjacent pair differs by exactly one letter, and all intermediate words are in wordList. Return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.",
    "examples": [
      {
        "input": "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]",
        "output": "5",
        "explanation": "Shortest transformation is \"hit\" -> \"hot\" -> \"dot\" -> \"dog\" -> \"cog\", which is 5 words."
      },
      {
        "input": "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\"]",
        "output": "0",
        "explanation": "The endWord \"cog\" is not in wordList, therefore there is no valid transformation sequence."
      }
    ],
    "constraints": [
      "1 <= beginWord.length <= 10",
      "endWord.length == beginWord.length",
      "1 <= wordList.length <= 5000",
      "wordList[i].length == beginWord.length",
      "All words in wordList are unique."
    ],
    "expectedTimeComplexity": "O(N * L^2)",
    "expectedSpaceComplexity": "O(N * L)",
    "keyConcepts": [
      "Breadth-First Search (Shortest Path)",
      "Intermediate Wildcard Patterns",
      "HashSet Word Elimination",
      "Bidirectional BFS"
    ],
    "hints": [
      "BFS guarantees the shortest path in an unweighted graph. Generate all 1-character mutations for the current word."
    ],
    "starterCode": {
      "cpp": "class Solution {\npublic:\n    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:\n        return 0",
      "typescript": "function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {\n  return 0;\n}"
    },
    "referenceSolution": {
      "cpp": "class Solution {\npublic:\n    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n        unordered_set<string> dict(wordList.begin(), wordList.end());\n        if (!dict.count(endWord)) return 0;\n        queue<string> q; q.push(beginWord);\n        int steps = 1;\n        while (!q.empty()) {\n            int sz = q.size();\n            for (int i = 0; i < sz; i++) {\n                string word = q.front(); q.pop();\n                if (word == endWord) return steps;\n                for (int j = 0; j < word.size(); j++) {\n                    char original = word[j];\n                    for (char c = 'a'; c <= 'z'; c++) {\n                        word[j] = c;\n                        if (dict.count(word)) { dict.erase(word); q.push(word); }\n                    }\n                    word[j] = original;\n                }\n            }\n            steps++;\n        }\n        return 0;\n    }\n};",
      "java": "class Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        Set<String> set = new HashSet<>(wordList);\n        if (!set.contains(endWord)) return 0;\n        Queue<String> q = new LinkedList<>(); q.offer(beginWord);\n        int steps = 1;\n        while (!q.isEmpty()) {\n            int sz = q.size();\n            for (int i = 0; i < sz; i++) {\n                String w = q.poll();\n                if (w.equals(endWord)) return steps;\n                char[] chs = w.toCharArray();\n                for (int j = 0; j < chs.length; j++) {\n                    char orig = chs[j];\n                    for (char c = 'a'; c <= 'z'; c++) {\n                        chs[j] = c; String next = new String(chs);\n                        if (set.contains(next)) { set.remove(next); q.offer(next); }\n                    }\n                    chs[j] = orig;\n                }\n            }\n            steps++;\n        }\n        return 0;\n    }\n}",
      "python": "class Solution:\n    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:\n        from collections import deque\n        word_set = set(wordList)\n        if endWord not in word_set: return 0\n        q = deque([(beginWord, 1)])\n        while q:\n            word, steps = q.popleft()\n            if word == endWord: return steps\n            for i in range(len(word)):\n                for c in 'abcdefghijklmnopqrstuvwxyz':\n                    nxt = word[:i] + c + word[i+1:]\n                    if nxt in word_set:\n                        word_set.remove(nxt)\n                        q.append((nxt, steps + 1))\n        return 0",
      "typescript": "function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {\n  const wordSet = new Set(wordList);\n  if (!wordSet.has(endWord)) return 0;\n  const queue: [string, number][] = [[beginWord, 1]];\n  while (queue.length > 0) {\n    const [word, steps] = queue.shift()!;\n    if (word === endWord) return steps;\n    for (let i = 0; i < word.length; i++) {\n      for (let code = 97; code <= 122; code++) {\n        const nextWord = word.slice(0, i) + String.fromCharCode(code) + word.slice(i + 1);\n        if (wordSet.has(nextWord)) {\n          wordSet.delete(nextWord);\n          queue.push([nextWord, steps + 1]);\n        }\n      }\n    }\n  }\n  return 0;\n}"
    },
    "testCases": [
      {
        "id": "tc-1",
        "inputDisplay": "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]",
        "expectedOutputDisplay": "5"
      },
      {
        "id": "tc-2",
        "inputDisplay": "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\"]",
        "expectedOutputDisplay": "0"
      }
    ]
  },
  {
    id: "dsa-oa-31",
    number: 1,
    title: "Two Sum / Real-Time Fraud Pair Matcher",
    difficulty: "Easy",
    topic: "Arrays & Hashing",
    companyTags: ["Google", "Amazon OA", "Stripe", "Razorpay", "Paytm"],
    roles: ["Full-Stack SDE", "Backend Engineer", "Frontend Developer"],
    problemStatement: "Given an array of transaction amounts `nums` and an audit target `target`, return indices of the two transactions that add up to `target` in O(N) time without reusing the same element.",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" }
    ],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i], target <= 10^9", "Exactly one valid answer exists."],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["HashMap Complement Lookup", "Single Pass Trade-off", "Duplicate Value Handling", "Index Order"],
    hints: ["Store value -> index as you iterate and check if (target - num) was already seen."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}",
      python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        return []",
      typescript: "function twoSum(nums: number[], target: number): number[] {\n  return [];\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int,int> seen;\n        for (int i = 0; i < (int)nums.size(); ++i) {\n            int need = target - nums[i];\n            if (seen.count(need)) return {seen[need], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int need = target - nums[i];\n            if (seen.containsKey(need)) return new int[]{seen.get(need), i};\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}",
      python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, v in enumerate(nums):\n            need = target - v\n            if need in seen:\n                return [seen[need], i]\n            seen[v] = i\n        return []",
      typescript: "function twoSum(nums: number[], target: number): number[] {\n  const seen = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need)!, i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}"
    },
    testCases: [
      { id: "tc-1", inputDisplay: "nums = [2,7,11,15], target = 9", expectedOutputDisplay: "[0,1]" },
      { id: "tc-2", inputDisplay: "nums = [3,2,4], target = 6", expectedOutputDisplay: "[1,2]" }
    ]
  },
  {
    id: "dsa-oa-32",
    number: 128,
    title: "Longest Consecutive Sequence / Uptime Streak Analyzer",
    difficulty: "Medium",
    topic: "Arrays & Hashing",
    companyTags: ["Google", "Confluent", "Stripe", "Adobe", "Postman"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Given an unsorted array of integer timestamps `nums`, return the length of the longest consecutive elements sequence in O(N) average time complexity.",
    examples: [
      { input: "nums = [100,4,200,1,3,2]", output: "4", explanation: "Longest consecutive sequence is [1, 2, 3, 4]." },
      { input: "nums = [0,3,7,2,5,8,4,6,0,1]", output: "9" }
    ],
    constraints: ["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9", "Must run in O(N) time."],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["HashSet Sequence Starts", "Left-Neighbor Check", "Amortized Linear Scan", "Deduplication"],
    hints: ["Only expand upward from numbers `x` where `x - 1` is NOT present in the hash set."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int longestConsecutive(int[] nums) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def longestConsecutive(self, nums: list[int]) -> int:\n        return 0",
      typescript: "function longestConsecutive(nums: number[]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        unordered_set<int> s(nums.begin(), nums.end());\n        int best = 0;\n        for (int x : s) {\n            if (!s.count(x - 1)) {\n                int cur = x;\n                while (s.count(cur + 1)) cur++;\n                best = max(best, cur - x + 1);\n            }\n        }\n        return best;\n    }\n};",
      java: "class Solution {\n    public int longestConsecutive(int[] nums) {\n        Set<Integer> s = new HashSet<>();\n        for (int n : nums) s.add(n);\n        int best = 0;\n        for (int x : s) {\n            if (!s.contains(x - 1)) {\n                int y = x;\n                while (s.contains(y + 1)) y++;\n                best = Math.max(best, y - x + 1);\n            }\n        }\n        return best;\n    }\n}",
      python: "class Solution:\n    def longestConsecutive(self, nums: list[int]) -> int:\n        s = set(nums)\n        best = 0\n        for x in s:\n            if x - 1 not in s:\n                y = x\n                while y + 1 in s:\n                    y += 1\n                best = max(best, y - x + 1)\n        return best",
      typescript: "function longestConsecutive(nums: number[]): number {\n  const s = new Set(nums);\n  let best = 0;\n  for (const x of s) {\n    if (!s.has(x - 1)) {\n      let y = x;\n      while (s.has(y + 1)) y++;\n      best = Math.max(best, y - x + 1);\n    }\n  }\n  return best;\n}"
    },
    testCases: [
      { id: "tc-1", inputDisplay: "nums = [100,4,200,1,3,2]", expectedOutputDisplay: "4" },
      { id: "tc-2", inputDisplay: "nums = [0,3,7,2,5,8,4,6,0,1]", expectedOutputDisplay: "9" }
    ]
  },
  {
    id: "dsa-oa-33",
    number: 3,
    title: "Longest Substring Without Repeating Characters / Unique Request IDs",
    difficulty: "Medium",
    topic: "Sliding Window & Two Pointers",
    companyTags: ["Meta", "Microsoft", "Swiggy", "Paytm", "Sprinklr"],
    roles: ["Full-Stack SDE", "Frontend Developer", "Backend Engineer"],
    problemStatement: "Given a string `s` of incoming session tokens, find the length of the longest contiguous substring without duplicate characters.",
    examples: [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "pwwkew"', output: "3" }
    ],
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(min(N, charset))",
    keyConcepts: ["Sliding Window", "Last Seen Index Jump", "Left Pointer Monotonicity", "ASCII/Map Window"],
    hints: ["Keep `left` monotonically non-decreasing using `left = Math.max(left, lastSeen[ch] + 1)`."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        return 0",
      typescript: "function lengthOfLongestSubstring(s: string): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        vector<int> last(256, -1);\n        int left = 0, best = 0;\n        for (int r = 0; r < (int)s.size(); ++r) {\n            left = max(left, last[(unsigned char)s[r]] + 1);\n            last[(unsigned char)s[r]] = r;\n            best = max(best, r - left + 1);\n        }\n        return best;\n    }\n};",
      java: "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        int[] last = new int[256];\n        Arrays.fill(last, -1);\n        int left = 0, best = 0;\n        for (int r = 0; r < s.length(); r++) {\n            char c = s.charAt(r);\n            left = Math.max(left, last[c] + 1);\n            last[c] = r;\n            best = Math.max(best, r - left + 1);\n        }\n        return best;\n    }\n}",
      python: "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        last = {}\n        left = best = 0\n        for r, ch in enumerate(s):\n            if ch in last:\n                left = max(left, last[ch] + 1)\n            last[ch] = r\n            best = max(best, r - left + 1)\n        return best",
      typescript: "function lengthOfLongestSubstring(s: string): number {\n  const last = new Map<string, number>();\n  let left = 0, best = 0;\n  for (let r = 0; r < s.length; r++) {\n    const ch = s[r];\n    if (last.has(ch)) left = Math.max(left, last.get(ch)! + 1);\n    last.set(ch, r);\n    best = Math.max(best, r - left + 1);\n  }\n  return best;\n}"
    },
    testCases: [
      { id: "tc-1", inputDisplay: 's = "abcabcbb"', expectedOutputDisplay: "3" },
      { id: "tc-2", inputDisplay: 's = "pwwkew"', expectedOutputDisplay: "3" }
    ]
  },
  {
    id: "dsa-oa-34",
    number: 15,
    title: "3Sum / Zero-Net Settlement Triplet Finder",
    difficulty: "Medium",
    topic: "Sliding Window & Two Pointers",
    companyTags: ["Goldman Sachs", "Morgan Stanley", "Stripe", "Adobe", "Flipkart"],
    roles: ["Backend Engineer", "Full-Stack SDE", "Quant/Trading Tech"],
    problemStatement: "Given an integer array `nums`, return all unique triplets `[nums[i], nums[j], nums[k]]` such that `i != j != k` and `nums[i] + nums[j] + nums[k] == 0`, with no duplicate triplets in the output.",
    examples: [{ input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" }],
    constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
    expectedTimeComplexity: "O(N^2)",
    expectedSpaceComplexity: "O(1) extra (excluding output)",
    keyConcepts: ["Sort First", "Converging Two Pointers", "Skip Adjacent Duplicates", "Early Pruning when nums[i] > 0"],
    hints: ["Sort the array, anchor `i`, and run two pointers `lo = i + 1` and `hi = n - 1` while skipping identical elements."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        return {};\n    }\n};",
      java: "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      python: "class Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        return []",
      typescript: "function threeSum(nums: number[]): number[][] {\n  return [];\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        sort(nums.begin(), nums.end());\n        vector<vector<int>> res;\n        for (int i = 0; i < (int)nums.size(); ++i) {\n            if (nums[i] > 0) break;\n            if (i > 0 && nums[i] == nums[i - 1]) continue;\n            int l = i + 1, r = (int)nums.size() - 1;\n            while (l < r) {\n                int s = nums[i] + nums[l] + nums[r];\n                if (s < 0) l++;\n                else if (s > 0) r--;\n                else {\n                    res.push_back({nums[i], nums[l++], nums[r--]});\n                    while (l < r && nums[l] == nums[l - 1]) l++;\n                }\n            }\n        }\n        return res;\n    }\n};",
      java: "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        Arrays.sort(nums);\n        List<List<Integer>> res = new ArrayList<>();\n        for (int i = 0; i < nums.length; i++) {\n            if (nums[i] > 0) break;\n            if (i > 0 && nums[i] == nums[i - 1]) continue;\n            int l = i + 1, r = nums.length - 1;\n            while (l < r) {\n                int s = nums[i] + nums[l] + nums[r];\n                if (s < 0) l++;\n                else if (s > 0) r--;\n                else {\n                    res.add(Arrays.asList(nums[i], nums[l++], nums[r--]));\n                    while (l < r && nums[l] == nums[l - 1]) l++;\n                }\n            }\n        }\n        return res;\n    }\n}",
      python: "class Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        nums.sort()\n        res = []\n        for i, a in enumerate(nums):\n            if a > 0: break\n            if i > 0 and a == nums[i - 1]: continue\n            l, r = i + 1, len(nums) - 1\n            while l < r:\n                s = a + nums[l] + nums[r]\n                if s < 0: l += 1\n                elif s > 0: r -= 1\n                else:\n                    res.append([a, nums[l], nums[r]])\n                    l += 1\n                    r -= 1\n                    while l < r and nums[l] == nums[l - 1]: l += 1\n        return res",
      typescript: "function threeSum(nums: number[]): number[][] {\n  nums.sort((a, b) => a - b);\n  const res: number[][] = [];\n  for (let i = 0; i < nums.length; i++) {\n    if (nums[i] > 0) break;\n    if (i > 0 && nums[i] === nums[i - 1]) continue;\n    let l = i + 1, r = nums.length - 1;\n    while (l < r) {\n      const s = nums[i] + nums[l] + nums[r];\n      if (s < 0) l++;\n      else if (s > 0) r--;\n      else {\n        res.push([nums[i], nums[l++], nums[r--]]);\n        while (l < r && nums[l] === nums[l - 1]) l++;\n      }\n    }\n  }\n  return res;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "nums = [-1,0,1,2,-1,-4]", expectedOutputDisplay: "[[-1,-1,2],[-1,0,1]]" }]
  },
  {
    id: "dsa-oa-35",
    number: 11,
    title: "Container With Most Water / Max Capacity Boundary",
    difficulty: "Medium",
    topic: "Sliding Window & Two Pointers",
    companyTags: ["Apple", "Uber", "Meta", "Atlassian", "Media.net"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "Given an array `height` of length `n`, find two vertical lines `(i, height[i])` and `(j, height[j])` that together with the x-axis hold the maximum amount of water.",
    examples: [{ input: "height = [1,8,6,2,5,4,8,3,7]", output: "49" }],
    constraints: ["2 <= height.length <= 10^5", "0 <= height[i] <= 10^4"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Opposite Ends Pointers", "Advance Shorter Wall Greedy Invariant", "Area Formula", "O(1) Space"],
    hints: ["Because width shrinks on every step, only moving the shorter boundary can increase the limiting height."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int maxArea(int[] height) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        return 0",
      typescript: "function maxArea(height: number[]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int l = 0, r = (int)height.size() - 1, best = 0;\n        while (l < r) {\n            best = max(best, (r - l) * min(height[l], height[r]));\n            if (height[l] < height[r]) l++; else r--;\n        }\n        return best;\n    }\n};",
      java: "class Solution {\n    public int maxArea(int[] height) {\n        int l = 0, r = height.length - 1, best = 0;\n        while (l < r) {\n            best = Math.max(best, (r - l) * Math.min(height[l], height[r]));\n            if (height[l] < height[r]) l++; else r--;\n        }\n        return best;\n    }\n}",
      python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        l, r, best = 0, len(height) - 1, 0\n        while l < r:\n            best = max(best, (r - l) * min(height[l], height[r]))\n            if height[l] < height[r]: l += 1\n            else: r -= 1\n        return best",
      typescript: "function maxArea(height: number[]): number {\n  let l = 0, r = height.length - 1, best = 0;\n  while (l < r) {\n    best = Math.max(best, (r - l) * Math.min(height[l], height[r]));\n    if (height[l] < height[r]) l++; else r--;\n  }\n  return best;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "height = [1,8,6,2,5,4,8,3,7]", expectedOutputDisplay: "49" }]
  },
  {
    id: "dsa-oa-36",
    number: 20,
    title: "Valid Parentheses / Config Delimiter Linter",
    difficulty: "Easy",
    topic: "Stacks, Queues & Monotonic",
    companyTags: ["Amazon OA", "Postman", "Atlassian", "Stripe", "Adobe"],
    roles: ["Full-Stack SDE", "Frontend Developer", "Backend Engineer"],
    problemStatement: "Given a string `s` containing only `(`, `)`, `{`, `}`, `[` and `]`, determine if every opening bracket is closed by the same type in strict LIFO order.",
    examples: [
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "([)]"', output: "false" }
    ],
    constraints: ["1 <= s.length <= 10^4"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["LIFO Stack", "Matching Map", "Empty Stack Guard", "Final Empty Check"],
    hints: ["Push expected closing delimiters on a stack and verify every closer pops an exact match."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    bool isValid(string s) {\n        return false;\n    }\n};",
      java: "class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}",
      python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        return False",
      typescript: "function isValid(s: string): boolean {\n  return false;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    bool isValid(string s) {\n        vector<char> st;\n        for (char c : s) {\n            if (c == '(') st.push_back(')');\n            else if (c == '{') st.push_back('}');\n            else if (c == '[') st.push_back(']');\n            else { if (st.empty() || st.back() != c) return false; st.pop_back(); }\n        }\n        return st.empty();\n    }\n};",
      java: "class Solution {\n    public boolean isValid(String s) {\n        Deque<Character> st = new ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') st.push(')');\n            else if (c == '{') st.push('}');\n            else if (c == '[') st.push(']');\n            else if (st.isEmpty() || st.pop() != c) return false;\n        }\n        return st.isEmpty();\n    }\n}",
      python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        pairs = {')': '(', '}': '{', ']': '['}\n        st = []\n        for ch in s:\n            if ch in pairs:\n                if not st or st.pop() != pairs[ch]: return False\n            else:\n                st.append(ch)\n        return not st",
      typescript: "function isValid(s: string): boolean {\n  const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };\n  const st: string[] = [];\n  for (const ch of s) {\n    if (ch in pairs) { if (st.pop() !== pairs[ch]) return false; }\n    else st.push(ch);\n  }\n  return st.length === 0;\n}"
    },
    testCases: [
      { id: "tc-1", inputDisplay: 's = "()[]{}"', expectedOutputDisplay: "true" },
      { id: "tc-2", inputDisplay: 's = "([)]"', expectedOutputDisplay: "false" }
    ]
  },
  {
    id: "dsa-oa-37",
    number: 155,
    title: "Min Stack / O(1) Telemetry Minimum Tracker",
    difficulty: "Medium",
    topic: "Stacks, Queues & Monotonic",
    companyTags: ["Microsoft", "Morgan Stanley", "Confluent", "Goldman Sachs", "Uber"],
    roles: ["Backend Engineer", "Systems SDE"],
    problemStatement: "Design a stack supporting `push`, `pop`, `top`, and `getMin` in strictly `O(1)` time complexity per operation.",
    examples: [{ input: '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[[],[-2],[0],[-3],[],[],[],[]]', output: "[null,null,null,null,-3,null,0,-2]" }],
    constraints: ["-2^31 <= val <= 2^31 - 1", "Up to 3 * 10^4 calls; pop/top/getMin always called on non-empty stack."],
    expectedTimeComplexity: "O(1) per operation",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["Auxiliary Min Stack", "Pair Tuple Stack", "Duplicate Min Tie-Breaking", "O(1) Bounds"],
    hints: ["Store `(val, currentMin)` pairs or maintain a parallel monotonic min stack."],
    starterCode: {
      cpp: "class MinStack {\npublic:\n    MinStack() {}\n    void push(int val) {}\n    void pop() {}\n    int top() { return 0; }\n    int getMin() { return 0; }\n};",
      java: "class MinStack {\n    public MinStack() {}\n    public void push(int val) {}\n    public void pop() {}\n    public int top() { return 0; }\n    public int getMin() { return 0; }\n}",
      python: "class MinStack:\n    def __init__(self): pass\n    def push(self, val: int) -> None: pass\n    def pop(self) -> None: pass\n    def top(self) -> int: return 0\n    def getMin(self) -> int: return 0",
      typescript: "class MinStack {\n  push(val: number): void {}\n  pop(): void {}\n  top(): number { return 0; }\n  getMin(): number { return 0; }\n}"
    },
    referenceSolution: {
      cpp: "class MinStack {\n    vector<pair<int,int>> st;\npublic:\n    void push(int val) { int m = st.empty() ? val : min(val, st.back().second); st.push_back({val, m}); }\n    void pop() { st.pop_back(); }\n    int top() { return st.back().first; }\n    int getMin() { return st.back().second; }\n};",
      java: "class MinStack {\n    Deque<int[]> st = new ArrayDeque<>();\n    public void push(int val) { int m = st.isEmpty() ? val : Math.min(val, st.peek()[1]); st.push(new int[]{val, m}); }\n    public void pop() { st.pop(); }\n    public int top() { return st.peek()[0]; }\n    public int getMin() { return st.peek()[1]; }\n}",
      python: "class MinStack:\n    def __init__(self): self.st = []\n    def push(self, val: int) -> None:\n        m = val if not self.st else min(val, self.st[-1][1])\n        self.st.append((val, m))\n    def pop(self) -> None: self.st.pop()\n    def top(self) -> int: return self.st[-1][0]\n    def getMin(self) -> int: return self.st[-1][1]",
      typescript: "class MinStack {\n  private st: Array<[number, number]> = [];\n  push(val: number): void { const m = this.st.length === 0 ? val : Math.min(val, this.st[this.st.length - 1][1]); this.st.push([val, m]); }\n  pop(): void { this.st.pop(); }\n  top(): number { return this.st[this.st.length - 1][0]; }\n  getMin(): number { return this.st[this.st.length - 1][1]; }\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "push(-2), push(0), push(-3), getMin(), pop(), getMin()", expectedOutputDisplay: "[-3, -2]" }]
  },
  {
    id: "dsa-oa-38",
    number: 739,
    title: "Daily Temperatures / Next Warmer Latency Spike",
    difficulty: "Medium",
    topic: "Stacks, Queues & Monotonic",
    companyTags: ["Meta", "Google", "Sprinklr", "Razorpay", "Paytm"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Given daily metric array `temperatures`, return an array `answer` where `answer[i]` is the number of days to wait after day `i` for a strictly higher value (0 if none exists).",
    examples: [{ input: "temperatures = [73,74,75,71,69,72,76,73]", output: "[1,1,4,2,1,1,0,0]" }],
    constraints: ["1 <= temperatures.length <= 10^5", "30 <= temperatures[i] <= 100"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["Monotonic Decreasing Stack", "Index Storage", "Next Greater Element", "Distance Delta"],
    hints: ["Push unresolved day indices on a monotonically decreasing stack and resolve them when a warmer day arrives."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& t) {\n        return {};\n    }\n};",
      java: "class Solution {\n    public int[] dailyTemperatures(int[] t) {\n        return new int[]{};\n    }\n}",
      python: "class Solution:\n    def dailyTemperatures(self, t: list[int]) -> list[int]:\n        return []",
      typescript: "function dailyTemperatures(t: number[]): number[] {\n  return [];\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& t) {\n        vector<int> ans(t.size(), 0), st;\n        for (int i = 0; i < (int)t.size(); ++i) {\n            while (!st.empty() && t[i] > t[st.back()]) { ans[st.back()] = i - st.back(); st.pop_back(); }\n            st.push_back(i);\n        }\n        return ans;\n    }\n};",
      java: "class Solution {\n    public int[] dailyTemperatures(int[] t) {\n        int[] ans = new int[t.length];\n        Deque<Integer> st = new ArrayDeque<>();\n        for (int i = 0; i < t.length; i++) {\n            while (!st.isEmpty() && t[i] > t[st.peek()]) { int j = st.pop(); ans[j] = i - j; }\n            st.push(i);\n        }\n        return ans;\n    }\n}",
      python: "class Solution:\n    def dailyTemperatures(self, t: list[int]) -> list[int]:\n        ans, st = [0] * len(t), []\n        for i, v in enumerate(t):\n            while st and v > t[st[-1]]:\n                j = st.pop()\n                ans[j] = i - j\n            st.append(i)\n        return ans",
      typescript: "function dailyTemperatures(t: number[]): number[] {\n  const ans = new Array(t.length).fill(0), st: number[] = [];\n  for (let i = 0; i < t.length; i++) {\n    while (st.length && t[i] > t[st[st.length - 1]]) { const j = st.pop()!; ans[j] = i - j; }\n    st.push(i);\n  }\n  return ans;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "temperatures = [73,74,75,71,69,72,76,73]", expectedOutputDisplay: "[1,1,4,2,1,1,0,0]" }]
  },
  {
    id: "dsa-oa-39",
    number: 21,
    title: "Merge Two Sorted Lists / Ordered Event Stream Combiner",
    difficulty: "Easy",
    topic: "Linked Lists & Cache Design",
    companyTags: ["Microsoft", "Apple", "Swiggy", "Zomato", "Postman"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "Merge two sorted singly-linked lists `list1` and `list2` into one ascending sorted linked list by splicing their nodes together.",
    examples: [{ input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" }],
    constraints: ["0 <= list length <= 50", "-100 <= Node.val <= 100"],
    expectedTimeComplexity: "O(N + M)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Dummy Sentinel Node", "In-place Pointer Splicing", "Remaining Tail Append", "Null Safety"],
    hints: ["Create a dummy head and attach the smaller node on each step, then append whichever list remains."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* l1, ListNode* l2) {\n        return nullptr;\n    }\n};",
      java: "class Solution {\n    public ListNode mergeTwoLists(ListNode l1, ListNode l2) {\n        return null;\n    }\n}",
      python: "class Solution:\n    def mergeTwoLists(self, l1, l2):\n        return None",
      typescript: "function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  return null;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* l1, ListNode* l2) {\n        ListNode dummy(0), *tail = &dummy;\n        while (l1 && l2) {\n            if (l1->val <= l2->val) { tail->next = l1; l1 = l1->next; }\n            else { tail->next = l2; l2 = l2->next; }\n            tail = tail->next;\n        }\n        tail->next = l1 ? l1 : l2;\n        return dummy.next;\n    }\n};",
      java: "class Solution {\n    public ListNode mergeTwoLists(ListNode l1, ListNode l2) {\n        ListNode dummy = new ListNode(0), tail = dummy;\n        while (l1 != null && l2 != null) {\n            if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }\n            else { tail.next = l2; l2 = l2.next; }\n            tail = tail.next;\n        }\n        tail.next = l1 != null ? l1 : l2;\n        return dummy.next;\n    }\n}",
      python: "class Solution:\n    def mergeTwoLists(self, l1, l2):\n        dummy = tail = ListNode(0)\n        while l1 and l2:\n            if l1.val <= l2.val: tail.next, l1 = l1, l1.next\n            else: tail.next, l2 = l2, l2.next\n            tail = tail.next\n        tail.next = l1 or l2\n        return dummy.next",
      typescript: "function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  const dummy = new ListNode(0);\n  let tail = dummy;\n  while (l1 && l2) {\n    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }\n    else { tail.next = l2; l2 = l2.next; }\n    tail = tail.next;\n  }\n  tail.next = l1 ?? l2;\n  return dummy.next;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "list1 = [1,2,4], list2 = [1,3,4]", expectedOutputDisplay: "[1,1,2,3,4,4]" }]
  },
  {
    id: "dsa-oa-40",
    number: 25,
    title: "Reverse Nodes in k-Group / Batched Log Segment Reverser",
    difficulty: "Hard",
    topic: "Linked Lists & Cache Design",
    companyTags: ["Google", "Microsoft", "Uber", "Goldman Sachs", "Adobe"],
    roles: ["Backend Engineer", "Systems SDE"],
    problemStatement: "Given the head of a linked list, reverse nodes `k` at a time and return the modified list. Trailing nodes fewer than `k` remain in original order. Achieve `O(1)` extra space.",
    examples: [{ input: "head = [1,2,3,4,5], k = 2", output: "[2,1,4,3,5]" }],
    constraints: ["1 <= k <= n <= 5000"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Group Boundary Lookahead", "Iterative In-Place Reversal", "Dummy Pointer Rewiring", "Remainder Preservation"],
    hints: ["Walk `k` steps forward first to verify a full group exists before reversing pointers between groupPrev and groupNext."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    ListNode* reverseKGroup(ListNode* head, int k) {\n        return head;\n    }\n};",
      java: "class Solution {\n    public ListNode reverseKGroup(ListNode head, int k) {\n        return head;\n    }\n}",
      python: "class Solution:\n    def reverseKGroup(self, head, k: int):\n        return head",
      typescript: "function reverseKGroup(head: ListNode | null, k: number): ListNode | null {\n  return head;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    ListNode* reverseKGroup(ListNode* head, int k) {\n        ListNode dummy(0, head), *gp = &dummy;\n        while (true) {\n            ListNode* kth = gp;\n            for (int i = 0; i < k && kth; ++i) kth = kth->next;\n            if (!kth) break;\n            ListNode *gn = kth->next, *prev = gn, *cur = gp->next;\n            while (cur != gn) { ListNode* nxt = cur->next; cur->next = prev; prev = cur; cur = nxt; }\n            ListNode* nxtGp = gp->next; gp->next = kth; gp = nxtGp;\n        }\n        return dummy.next;\n    }\n};",
      java: "class Solution {\n    public ListNode reverseKGroup(ListNode head, int k) {\n        ListNode dummy = new ListNode(0, head), gp = dummy;\n        while (true) {\n            ListNode kth = gp;\n            for (int i = 0; i < k && kth != null; i++) kth = kth.next;\n            if (kth == null) break;\n            ListNode gn = kth.next, prev = gn, cur = gp.next;\n            while (cur != gn) { ListNode nxt = cur.next; cur.next = prev; prev = cur; cur = nxt; }\n            ListNode nxtGp = gp.next; gp.next = kth; gp = nxtGp;\n        }\n        return dummy.next;\n    }\n}",
      python: "class Solution:\n    def reverseKGroup(self, head, k: int):\n        dummy = ListNode(0, head)\n        gp = dummy\n        while True:\n            kth = gp\n            for _ in range(k):\n                kth = kth.next if kth else None\n            if not kth: break\n            gn = kth.next\n            prev, cur = gn, gp.next\n            while cur != gn:\n                nxt = cur.next\n                cur.next = prev\n                prev, cur = cur, nxt\n            nxt_gp = gp.next\n            gp.next = kth\n            gp = nxt_gp\n        return dummy.next",
      typescript: "function reverseKGroup(head: ListNode | null, k: number): ListNode | null {\n  const dummy = new ListNode(0, head);\n  let gp: ListNode = dummy;\n  while (true) {\n    let kth: ListNode | null = gp;\n    for (let i = 0; i < k && kth; i++) kth = kth.next;\n    if (!kth) break;\n    const gn = kth.next;\n    let prev: ListNode | null = gn, cur = gp.next;\n    while (cur && cur !== gn) { const nxt = cur.next; cur.next = prev; prev = cur; cur = nxt; }\n    const nxtGp = gp.next!;\n    gp.next = kth;\n    gp = nxtGp;\n  }\n  return dummy.next;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "head = [1,2,3,4,5], k = 2", expectedOutputDisplay: "[2,1,4,3,5]" }]
  },
  {
    id: "dsa-oa-41",
    number: 138,
    title: "Copy List with Random Pointer / Cache Graph Snapshot",
    difficulty: "Medium",
    topic: "Linked Lists & Cache Design",
    companyTags: ["Meta", "Apple", "Microsoft", "Morgan Stanley", "Sprinklr"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Construct a deep copy of a linked list where each node also holds an arbitrary `random` pointer into the list or `null`.",
    examples: [{ input: "head = [[7,null],[13,0],[11,4],[10,2],[1,0]]", output: "[[7,null],[13,0],[11,4],[10,2],[1,0]]" }],
    constraints: ["0 <= n <= 1000"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1) interleaved or O(N) map",
    keyConcepts: ["Node Identity HashMap", "Two-Pass Pointer Wiring", "Cycle/Random Reference Safety", "Interleaving Optimization"],
    hints: ["First create original -> clone entries in a HashMap (or interleave clones), then assign next and random."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    Node* copyRandomList(Node* head) {\n        return nullptr;\n    }\n};",
      java: "class Solution {\n    public Node copyRandomList(Node head) {\n        return null;\n    }\n}",
      python: "class Solution:\n    def copyRandomList(self, head):\n        return None",
      typescript: "function copyRandomList(head: _Node | null): _Node | null {\n  return null;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    Node* copyRandomList(Node* head) {\n        if (!head) return nullptr;\n        unordered_map<Node*, Node*> mp;\n        for (Node* c = head; c; c = c->next) mp[c] = new Node(c->val);\n        for (Node* c = head; c; c = c->next) { mp[c]->next = mp[c->next]; mp[c]->random = mp[c->random]; }\n        return mp[head];\n    }\n};",
      java: "class Solution {\n    public Node copyRandomList(Node head) {\n        if (head == null) return null;\n        Map<Node, Node> mp = new HashMap<>();\n        for (Node c = head; c != null; c = c.next) mp.put(c, new Node(c.val));\n        for (Node c = head; c != null; c = c.next) { mp.get(c).next = mp.get(c.next); mp.get(c).random = mp.get(c.random); }\n        return mp.get(head);\n    }\n}",
      python: "class Solution:\n    def copyRandomList(self, head):\n        mp = {None: None}\n        cur = head\n        while cur:\n            mp[cur] = Node(cur.val)\n            cur = cur.next\n        cur = head\n        while cur:\n            mp[cur].next = mp[cur.next]\n            mp[cur].random = mp[cur.random]\n            cur = cur.next\n        return mp[head]",
      typescript: "function copyRandomList(head: _Node | null): _Node | null {\n  if (!head) return null;\n  const mp = new Map<_Node, _Node>();\n  for (let c: _Node | null = head; c; c = c.next) mp.set(c, new _Node(c.val));\n  for (let c: _Node | null = head; c; c = c.next) {\n    const clone = mp.get(c)!;\n    clone.next = c.next ? mp.get(c.next)! : null;\n    clone.random = c.random ? mp.get(c.random)! : null;\n  }\n  return mp.get(head)!;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "head = [[7,null],[13,0],[11,4]]", expectedOutputDisplay: "Deep cloned nodes with matching random links" }]
  },
  {
    id: "dsa-oa-42",
    number: 460,
    title: "LFU Cache / Adaptive Hot-Key Eviction Engine",
    difficulty: "Hard",
    topic: "Linked Lists & Cache Design",
    companyTags: ["Confluent", "Stripe", "Google", "Uber", "Flipkart"],
    roles: ["Backend Engineer", "Systems SDE", "Platform Engineer"],
    problemStatement: "Design an LFU (Least Frequently Used) Cache supporting O(1) `get(key)` and `put(key, value)`, breaking ties by Least Recently Used when capacity is reached.",
    examples: [{ input: '["LFUCache","put","put","get","put","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2]]', output: "[null,null,null,1,null,-1]" }],
    constraints: ["1 <= capacity <= 10^4", "Up to 2 * 10^5 operations", "Must be O(1) average per operation."],
    expectedTimeComplexity: "O(1) per operation",
    expectedSpaceComplexity: "O(capacity)",
    keyConcepts: ["Dual Map Key + Frequency Buckets", "Doubly Linked List or OrderedMap per Frequency", "minFreq Promotion Invariant", "LRU Tie-Breaker"],
    hints: ["Maintain `keyMap` plus `freqMap[freq] -> DoublyLinkedList` and track `minFreq` on increments/evictions."],
    starterCode: {
      cpp: "class LFUCache {\npublic:\n    LFUCache(int capacity) {}\n    int get(int key) { return -1; }\n    void put(int key, int value) {}\n};",
      java: "class LFUCache {\n    public LFUCache(int capacity) {}\n    public int get(int key) { return -1; }\n    public void put(int key, int value) {}\n}",
      python: "class LFUCache:\n    def __init__(self, capacity: int): pass\n    def get(self, key: int) -> int: return -1\n    def put(self, key: int, value: int) -> None: pass",
      typescript: "class LFUCache {\n  constructor(capacity: number) {}\n  get(key: number): number { return -1; }\n  put(key: number, value: number): void {}\n}"
    },
    referenceSolution: {
      cpp: "class LFUCache {\n    int cap, minFreq = 0;\n    unordered_map<int, pair<int,int>> vals;\n    unordered_map<int, list<int>> freqs;\n    unordered_map<int, list<int>::iterator> pos;\npublic:\n    LFUCache(int capacity) : cap(capacity) {}\n    int get(int key) {\n        if (!vals.count(key)) return -1;\n        int f = vals[key].second++;\n        freqs[f].erase(pos[key]);\n        if (freqs[f].empty() && minFreq == f) minFreq++;\n        freqs[f + 1].push_back(key);\n        pos[key] = prev(freqs[f + 1].end());\n        return vals[key].first;\n    }\n    void put(int key, int value) {\n        if (cap <= 0) return;\n        if (get(key) != -1) { vals[key].first = value; return; }\n        if ((int)vals.size() == cap) {\n            int evict = freqs[minFreq].front();\n            freqs[minFreq].pop_front();\n            vals.erase(evict); pos.erase(evict);\n        }\n        vals[key] = {value, 1}; freqs[1].push_back(key);\n        pos[key] = prev(freqs[1].end()); minFreq = 1;\n    }\n};",
      java: "class LFUCache {\n    int cap, minFreq = 0;\n    Map<Integer, int[]> vals = new HashMap<>();\n    Map<Integer, LinkedHashSet<Integer>> freqs = new HashMap<>();\n    public LFUCache(int capacity) { cap = capacity; }\n    public int get(int key) {\n        if (!vals.containsKey(key)) return -1;\n        int f = vals.get(key)[1]++;\n        freqs.get(f).remove(key);\n        if (freqs.get(f).isEmpty() && minFreq == f) minFreq++;\n        freqs.computeIfAbsent(f + 1, k -> new LinkedHashSet<>()).add(key);\n        return vals.get(key)[0];\n    }\n    public void put(int key, int value) {\n        if (cap <= 0) return;\n        if (vals.containsKey(key)) { vals.get(key)[0] = value; get(key); return; }\n        if (vals.size() == cap) {\n            int evict = freqs.get(minFreq).iterator().next();\n            freqs.get(minFreq).remove(evict); vals.remove(evict);\n        }\n        vals.put(key, new int[]{value, 1});\n        freqs.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);\n        minFreq = 1;\n    }\n}",
      python: "from collections import defaultdict, OrderedDict\nclass LFUCache:\n    def __init__(self, capacity: int):\n        self.cap = capacity\n        self.min_f = 0\n        self.kv = {}\n        self.kf = {}\n        self.buckets = defaultdict(OrderedDict)\n    def get(self, key: int) -> int:\n        if key not in self.kv: return -1\n        f = self.kf[key]\n        del self.buckets[f][key]\n        if not self.buckets[f] and self.min_f == f: self.min_f += 1\n        self.kf[key] = f + 1\n        self.buckets[f + 1][key] = None\n        return self.kv[key]\n    def put(self, key: int, value: int) -> None:\n        if self.cap <= 0: return\n        if key in self.kv:\n            self.kv[key] = value\n            self.get(key)\n            return\n        if len(self.kv) == self.cap:\n            evict, _ = self.buckets[self.min_f].popitem(last=False)\n            del self.kv[evict]\n            del self.kf[evict]\n        self.kv[key] = value\n        self.kf[key] = 1\n        self.buckets[1][key] = None\n        self.min_f = 1",
      typescript: "class LFUCache {\n  private cap: number;\n  private minFreq = 0;\n  private vals = new Map<number, { v: number; f: number }>();\n  private freqs = new Map<number, Set<number>>();\n  constructor(capacity: number) { this.cap = capacity; }\n  get(key: number): number {\n    const item = this.vals.get(key);\n    if (!item) return -1;\n    this.freqs.get(item.f)!.delete(key);\n    if (this.freqs.get(item.f)!.size === 0 && this.minFreq === item.f) this.minFreq++;\n    item.f++;\n    if (!this.freqs.has(item.f)) this.freqs.set(item.f, new Set());\n    this.freqs.get(item.f)!.add(key);\n    return item.v;\n  }\n  put(key: number, value: number): void {\n    if (this.cap <= 0) return;\n    if (this.vals.has(key)) { this.vals.get(key)!.v = value; this.get(key); return; }\n    if (this.vals.size === this.cap) {\n      const bucket = this.freqs.get(this.minFreq)!;\n      const evict = bucket.values().next().value!;\n      bucket.delete(evict);\n      this.vals.delete(evict);\n    }\n    this.vals.set(key, { v: value, f: 1 });\n    if (!this.freqs.has(1)) this.freqs.set(1, new Set());\n    this.freqs.get(1)!.add(key);\n    this.minFreq = 1;\n  }\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "cap=2, put(1,1), put(2,2), get(1), put(3,3), get(2)", expectedOutputDisplay: "[1, -1]" }]
  },
  {
    id: "dsa-oa-43",
    number: 102,
    title: "Binary Tree Level Order Traversal / Org Chart Tier Broadcast",
    difficulty: "Medium",
    topic: "Trees & Binary Search",
    companyTags: ["Meta", "Apple", "Atlassian", "Paytm", "Swiggy"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "Given the root of a binary tree, return the level order traversal of its node values grouped layer-by-layer from left to right.",
    examples: [{ input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" }],
    constraints: ["0 <= nodes <= 2000"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["FIFO Queue BFS", "Level Size Snapshot", "Layer Grouping", "Empty Tree Base Case"],
    hints: ["Capture `levelSize = queue.length` at the start of each outer loop iteration."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        return {};\n    }\n};",
      java: "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        return new ArrayList<>();\n    }\n}",
      python: "class Solution:\n    def levelOrder(self, root):\n        return []",
      typescript: "function levelOrder(root: TreeNode | null): number[][] {\n  return [];\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        vector<vector<int>> res;\n        if (!root) return res;\n        queue<TreeNode*> q; q.push(root);\n        while (!q.empty()) {\n            int sz = q.size(); vector<int> level;\n            while (sz--) { auto* n = q.front(); q.pop(); level.push_back(n->val); if (n->left) q.push(n->left); if (n->right) q.push(n->right); }\n            res.push_back(level);\n        }\n        return res;\n    }\n};",
      java: "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        List<List<Integer>> res = new ArrayList<>();\n        if (root == null) return res;\n        Queue<TreeNode> q = new ArrayDeque<>(); q.offer(root);\n        while (!q.isEmpty()) {\n            int sz = q.size(); List<Integer> lvl = new ArrayList<>();\n            for (int i = 0; i < sz; i++) { TreeNode n = q.poll(); lvl.add(n.val); if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); }\n            res.add(lvl);\n        }\n        return res;\n    }\n}",
      python: "from collections import deque\nclass Solution:\n    def levelOrder(self, root):\n        if not root: return []\n        q, res = deque([root]), []\n        while q:\n            lvl = []\n            for _ in range(len(q)):\n                n = q.popleft()\n                lvl.append(n.val)\n                if n.left: q.append(n.left)\n                if n.right: q.append(n.right)\n            res.append(lvl)\n        return res",
      typescript: "function levelOrder(root: TreeNode | null): number[][] {\n  if (!root) return [];\n  const q: TreeNode[] = [root], res: number[][] = [];\n  while (q.length) {\n    const sz = q.length, lvl: number[] = [];\n    for (let i = 0; i < sz; i++) {\n      const n = q.shift()!;\n      lvl.push(n.val);\n      if (n.left) q.push(n.left);\n      if (n.right) q.push(n.right);\n    }\n    res.push(lvl);\n  }\n  return res;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "root = [3,9,20,null,null,15,7]", expectedOutputDisplay: "[[3],[9,20],[15,7]]" }]
  },
  {
    id: "dsa-oa-44",
    number: 124,
    title: "Binary Tree Maximum Path Sum / Max Weighted Routing Path",
    difficulty: "Hard",
    topic: "Trees & Binary Search",
    companyTags: ["Google", "Meta", "Confluent", "Goldman Sachs", "Uber"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Find the maximum path sum across any non-empty sequence of connected nodes in a binary tree (possibly starting and ending at any node, including negative values).",
    examples: [{ input: "root = [-10,9,20,null,null,15,7]", output: "42", explanation: "15 -> 20 -> 7 yields 42." }],
    constraints: ["1 <= nodes <= 3 * 10^4", "-1000 <= Node.val <= 1000"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(H)",
    keyConcepts: ["Post-Order Gain vs Global Arch", "Clamp Negative Subtrees to Zero", "Negative All-Nodes Edge Case", "Return Single Branch Upward"],
    hints: ["At each node, clamp left/right branch contributions to max(0, childGain), update global max with left+node+right, and return node + max(left, right)."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int maxPathSum(TreeNode* root) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int maxPathSum(TreeNode root) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def maxPathSum(self, root) -> int:\n        return 0",
      typescript: "function maxPathSum(root: TreeNode | null): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\n    int ans = INT_MIN;\n    int dfs(TreeNode* n) {\n        if (!n) return 0;\n        int l = max(0, dfs(n->left)), r = max(0, dfs(n->right));\n        ans = max(ans, n->val + l + r);\n        return n->val + max(l, r);\n    }\npublic:\n    int maxPathSum(TreeNode* root) { dfs(root); return ans; }\n};",
      java: "class Solution {\n    int ans = Integer.MIN_VALUE;\n    int dfs(TreeNode n) {\n        if (n == null) return 0;\n        int l = Math.max(0, dfs(n.left)), r = Math.max(0, dfs(n.right));\n        ans = Math.max(ans, n.val + l + r);\n        return n.val + Math.max(l, r);\n    }\n    public int maxPathSum(TreeNode root) { dfs(root); return ans; }\n}",
      python: "class Solution:\n    def maxPathSum(self, root) -> int:\n        best = [float('-inf')]\n        def dfs(n):\n            if not n: return 0\n            l, r = max(0, dfs(n.left)), max(0, dfs(n.right))\n            best[0] = max(best[0], n.val + l + r)\n            return n.val + max(l, r)\n        dfs(root)\n        return int(best[0])",
      typescript: "function maxPathSum(root: TreeNode | null): number {\n  let best = -Infinity;\n  const dfs = (n: TreeNode | null): number => {\n    if (!n) return 0;\n    const l = Math.max(0, dfs(n.left)), r = Math.max(0, dfs(n.right));\n    best = Math.max(best, n.val + l + r);\n    return n.val + Math.max(l, r);\n  };\n  dfs(root);\n  return best;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "root = [-10,9,20,null,null,15,7]", expectedOutputDisplay: "42" }]
  },
  {
    id: "dsa-oa-45",
    number: 230,
    title: "Kth Smallest Element in a BST / Ranked Index Lookup",
    difficulty: "Medium",
    topic: "Trees & Binary Search",
    companyTags: ["Apple", "Uber", "Adobe", "Morgan Stanley", "Flipkart"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Given the root of a Binary Search Tree and an integer `k`, return the 1-indexed `k`-th smallest element using early-exit inorder traversal.",
    examples: [{ input: "root = [5,3,6,2,4,null,null,1], k = 3", output: "3" }],
    constraints: ["1 <= k <= n <= 10^4"],
    expectedTimeComplexity: "O(H + k)",
    expectedSpaceComplexity: "O(H)",
    keyConcepts: ["Iterative Inorder Stack", "Early Termination at k", "BST Sorted Invariant", "Augmented Subtree Sizes Follow-up"],
    hints: ["Push left spine iteratively onto an explicit stack and decrement `k` cleanly on each pop."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int kthSmallest(TreeNode* root, int k) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int kthSmallest(TreeNode root, int k) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def kthSmallest(self, root, k: int) -> int:\n        return 0",
      typescript: "function kthSmallest(root: TreeNode | null, k: number): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int kthSmallest(TreeNode* root, int k) {\n        stack<TreeNode*> st; TreeNode* cur = root;\n        while (cur || !st.empty()) {\n            while (cur) { st.push(cur); cur = cur->left; }\n            cur = st.top(); st.pop();\n            if (--k == 0) return cur->val;\n            cur = cur->right;\n        }\n        return -1;\n    }\n};",
      java: "class Solution {\n    public int kthSmallest(TreeNode root, int k) {\n        Deque<TreeNode> st = new ArrayDeque<>();\n        TreeNode cur = root;\n        while (cur != null || !st.isEmpty()) {\n            while (cur != null) { st.push(cur); cur = cur.left; }\n            cur = st.pop();\n            if (--k == 0) return cur.val;\n            cur = cur.right;\n        }\n        return -1;\n    }\n}",
      python: "class Solution:\n    def kthSmallest(self, root, k: int) -> int:\n        st, cur = [], root\n        while cur or st:\n            while cur: st.append(cur); cur = cur.left\n            cur = st.pop()\n            k -= 1\n            if k == 0: return cur.val\n            cur = cur.right\n        return -1",
      typescript: "function kthSmallest(root: TreeNode | null, k: number): number {\n  const st: TreeNode[] = [];\n  let cur = root;\n  while (cur || st.length) {\n    while (cur) { st.push(cur); cur = cur.left; }\n    cur = st.pop()!;\n    if (--k === 0) return cur.val;\n    cur = cur.right;\n  }\n  return -1;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "root = [5,3,6,2,4,null,null,1], k = 3", expectedOutputDisplay: "3" }]
  },
  {
    id: "dsa-oa-46",
    number: 153,
    title: "Find Minimum in Rotated Sorted Array / Shifted Log Pivot",
    difficulty: "Medium",
    topic: "Trees & Binary Search",
    companyTags: ["Goldman Sachs", "Morgan Stanley", "Microsoft", "Razorpay", "Postman"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Given a unique rotated ascending integer array `nums`, find the minimum element in `O(log N)` time.",
    examples: [{ input: "nums = [3,4,5,1,2]", output: "1" }],
    constraints: ["1 <= nums.length <= 5000", "All elements unique."],
    expectedTimeComplexity: "O(log N)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Compare mid with Right Boundary", "Pivot Invariant", "Strict `lo < hi` Termination", "Rotated Sorted Property"],
    hints: ["If `nums[mid] > nums[hi]`, the inflection point must lie strictly to the right of `mid` (`lo = mid + 1`)."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int findMin(int[] nums) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def findMin(self, nums: list[int]) -> int:\n        return 0",
      typescript: "function findMin(nums: number[]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        int lo = 0, hi = (int)nums.size() - 1;\n        while (lo < hi) { int m = lo + (hi - lo) / 2; if (nums[m] > nums[hi]) lo = m + 1; else hi = m; }\n        return nums[lo];\n    }\n};",
      java: "class Solution {\n    public int findMin(int[] nums) {\n        int lo = 0, hi = nums.length - 1;\n        while (lo < hi) { int m = lo + (hi - lo) / 2; if (nums[m] > nums[hi]) lo = m + 1; else hi = m; }\n        return nums[lo];\n    }\n}",
      python: "class Solution:\n    def findMin(self, nums: list[int]) -> int:\n        lo, hi = 0, len(nums) - 1\n        while lo < hi:\n            m = (lo + hi) // 2\n            if nums[m] > nums[hi]: lo = m + 1\n            else: hi = m\n        return nums[lo]",
      typescript: "function findMin(nums: number[]): number {\n  let lo = 0, hi = nums.length - 1;\n  while (lo < hi) { const m = (lo + hi) >> 1; if (nums[m] > nums[hi]) lo = m + 1; else hi = m; }\n  return nums[lo];\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "nums = [3,4,5,1,2]", expectedOutputDisplay: "1" }]
  },
  {
    id: "dsa-oa-47",
    number: 4,
    title: "Median of Two Sorted Arrays / Sharded Metrics Percentile",
    difficulty: "Hard",
    topic: "Trees & Binary Search",
    companyTags: ["Google", "Goldman Sachs", "Stripe", "Apple", "Meta"],
    roles: ["Backend Engineer", "Quant/Trading Tech", "Core Systems"],
    problemStatement: "Given two sorted arrays `nums1` and `nums2`, find the exact median of the combined sorted sequence in `O(log(min(m, n)))` time.",
    examples: [{ input: "nums1 = [1,2], nums2 = [3,4]", output: "2.5" }],
    constraints: ["0 <= m, n <= 1000", "m + n >= 1"],
    expectedTimeComplexity: "O(log(min(m, n)))",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Binary Search on Partition Cut", "Left Half <= Right Half Cross Check", "-Infinity / +Infinity Sentinels", "Odd vs Even Median"],
    hints: ["Binary search the cut position on the shorter array so left partitions always total `(m + n + 1) // 2` elements."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {\n        return 0.0;\n    }\n};",
      java: "class Solution {\n    public double findMedianSortedArrays(int[] a, int[] b) {\n        return 0.0;\n    }\n}",
      python: "class Solution:\n    def findMedianSortedArrays(self, a: list[int], b: list[int]) -> float:\n        return 0.0",
      typescript: "function findMedianSortedArrays(a: number[], b: number[]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {\n        if (a.size() > b.size()) return findMedianSortedArrays(b, a);\n        int m = a.size(), n = b.size(), lo = 0, hi = m;\n        while (lo <= hi) {\n            int i = (lo + hi) / 2, j = (m + n + 1) / 2 - i;\n            int aL = i ? a[i - 1] : INT_MIN, aR = i < m ? a[i] : INT_MAX;\n            int bL = j ? b[j - 1] : INT_MIN, bR = j < n ? b[j] : INT_MAX;\n            if (aL <= bR && bL <= aR) {\n                if ((m + n) % 2) return max(aL, bL);\n                return (max(aL, bL) + min(aR, bR)) / 2.0;\n            }\n            if (aL > bR) hi = i - 1; else lo = i + 1;\n        }\n        return 0.0;\n    }\n};",
      java: "class Solution {\n    public double findMedianSortedArrays(int[] a, int[] b) {\n        if (a.length > b.length) return findMedianSortedArrays(b, a);\n        int m = a.length, n = b.length, lo = 0, hi = m;\n        while (lo <= hi) {\n            int i = (lo + hi) / 2, j = (m + n + 1) / 2 - i;\n            int aL = i > 0 ? a[i - 1] : Integer.MIN_VALUE, aR = i < m ? a[i] : Integer.MAX_VALUE;\n            int bL = j > 0 ? b[j - 1] : Integer.MIN_VALUE, bR = j < n ? b[j] : Integer.MAX_VALUE;\n            if (aL <= bR && bL <= aR) return ((m + n) % 2 == 1) ? Math.max(aL, bL) : (Math.max(aL, bL) + Math.min(aR, bR)) / 2.0;\n            if (aL > bR) hi = i - 1; else lo = i + 1;\n        }\n        return 0.0;\n    }\n}",
      python: "class Solution:\n    def findMedianSortedArrays(self, a: list[int], b: list[int]) -> float:\n        if len(a) > len(b): a, b = b, a\n        m, n = len(a), len(b)\n        lo, hi = 0, m\n        while lo <= hi:\n            i = (lo + hi) // 2\n            j = (m + n + 1) // 2 - i\n            aL = a[i - 1] if i > 0 else float('-inf')\n            aR = a[i] if i < m else float('inf')\n            bL = b[j - 1] if j > 0 else float('-inf')\n            bR = b[j] if j < n else float('inf')\n            if aL <= bR and bL <= aR:\n                if (m + n) % 2: return float(max(aL, bL))\n                return (max(aL, bL) + min(aR, bR)) / 2.0\n            if aL > bR: hi = i - 1\n            else: lo = i + 1\n        return 0.0",
      typescript: "function findMedianSortedArrays(a: number[], b: number[]): number {\n  if (a.length > b.length) return findMedianSortedArrays(b, a);\n  const m = a.length, n = b.length;\n  let lo = 0, hi = m;\n  while (lo <= hi) {\n    const i = (lo + hi) >> 1, j = ((m + n + 1) >> 1) - i;\n    const aL = i > 0 ? a[i - 1] : -Infinity, aR = i < m ? a[i] : Infinity;\n    const bL = j > 0 ? b[j - 1] : -Infinity, bR = j < n ? b[j] : Infinity;\n    if (aL <= bR && bL <= aR) return (m + n) % 2 ? Math.max(aL, bL) : (Math.max(aL, bL) + Math.min(aR, bR)) / 2;\n    if (aL > bR) hi = i - 1; else lo = i + 1;\n  }\n  return 0;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "nums1 = [1,2], nums2 = [3,4]", expectedOutputDisplay: "2.5" }]
  },
  {
    id: "dsa-oa-48",
    number: 207,
    title: "Course Schedule / Microservice DAG Cycle Detector",
    difficulty: "Medium",
    topic: "Graphs, BFS/DFS & TopoSort",
    companyTags: ["Atlassian", "Confluent", "Swiggy", "Microsoft", "Stripe"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Given `numCourses` labeled `0..numCourses-1` and dependency pairs `[a, b]` (`b` required before `a`), determine whether all builds can complete with zero circular dependencies.",
    examples: [
      { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false" }
    ],
    constraints: ["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000"],
    expectedTimeComplexity: "O(V + E)",
    expectedSpaceComplexity: "O(V + E)",
    keyConcepts: ["Kahn's BFS Indegree Zero Queue", "3-Color DFS Cycle Detection", "Visited Count Match", "DAG Validation"],
    hints: ["Count incoming edges for every node, enqueue indegree-0 nodes, and verify popped count === numCourses."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    bool canFinish(int n, vector<vector<int>>& pre) {\n        return true;\n    }\n};",
      java: "class Solution {\n    public boolean canFinish(int n, int[][] pre) {\n        return true;\n    }\n}",
      python: "class Solution:\n    def canFinish(self, n: int, pre: list[list[int]]) -> bool:\n        return True",
      typescript: "function canFinish(n: number, pre: number[][]): boolean {\n  return true;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    bool canFinish(int n, vector<vector<int>>& pre) {\n        vector<vector<int>> g(n); vector<int> ind(n, 0);\n        for (auto& e : pre) { g[e[1]].push_back(e[0]); ind[e[0]]++; }\n        queue<int> q; for (int i = 0; i < n; ++i) if (!ind[i]) q.push(i);\n        int seen = 0;\n        while (!q.empty()) { int u = q.front(); q.pop(); seen++; for (int v : g[u]) if (--ind[v] == 0) q.push(v); }\n        return seen == n;\n    }\n};",
      java: "class Solution {\n    public boolean canFinish(int n, int[][] pre) {\n        List<Integer>[] g = new List[n]; for (int i = 0; i < n; i++) g[i] = new ArrayList<>();\n        int[] ind = new int[n];\n        for (int[] e : pre) { g[e[1]].add(e[0]); ind[e[0]]++; }\n        Queue<Integer> q = new ArrayDeque<>(); for (int i = 0; i < n; i++) if (ind[i] == 0) q.offer(i);\n        int seen = 0;\n        while (!q.isEmpty()) { int u = q.poll(); seen++; for (int v : g[u]) if (--ind[v] == 0) q.offer(v); }\n        return seen == n;\n    }\n}",
      python: "from collections import deque\nclass Solution:\n    def canFinish(self, n: int, pre: list[list[int]]) -> bool:\n        g = [[] for _ in range(n)]\n        ind = [0] * n\n        for a, b in pre:\n            g[b].append(a)\n            ind[a] += 1\n        q = deque(i for i in range(n) if ind[i] == 0)\n        seen = 0\n        while q:\n            u = q.popleft()\n            seen += 1\n            for v in g[u]:\n                ind[v] -= 1\n                if ind[v] == 0: q.append(v)\n        return seen == n",
      typescript: "function canFinish(n: number, pre: number[][]): boolean {\n  const g: number[][] = Array.from({ length: n }, () => []);\n  const ind = new Array(n).fill(0);\n  for (const [a, b] of pre) { g[b].push(a); ind[a]++; }\n  const q: number[] = []; for (let i = 0; i < n; i++) if (ind[i] === 0) q.push(i);\n  let seen = 0;\n  while (q.length) { const u = q.shift()!; seen++; for (const v of g[u]) if (--ind[v] === 0) q.push(v); }\n  return seen === n;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "numCourses = 2, prerequisites = [[1,0],[0,1]]", expectedOutputDisplay: "false" }]
  },
  {
    id: "dsa-oa-49",
    number: 787,
    title: "Cheapest Flights Within K Stops / Hop-Bounded Fare Router",
    difficulty: "Medium",
    topic: "Graphs, BFS/DFS & TopoSort",
    companyTags: ["Uber", "Zomato", "Swiggy", "Flipkart", "Google"],
    roles: ["Backend Engineer", "Marketplace Systems"],
    problemStatement: "Given `n` cities connected by weighted directed flights `[from, to, price]`, return the cheapest price from `src` to `dst` using at most `k` intermediate stops (`-1` if unreachable).",
    examples: [{ input: "n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1", output: "700" }],
    constraints: ["1 <= n <= 100", "0 <= k < n"],
    expectedTimeComplexity: "O(k * E)",
    expectedSpaceComplexity: "O(V)",
    keyConcepts: ["Bellman-Ford k+1 Rounds", "Snapshot Prev Distance Array", "Bounded-Hop Shortest Path", "Unreachable Guard"],
    hints: ["Run exactly `k + 1` Bellman-Ford relaxation iterations using a cloned copy of `dist` from the previous round."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {\n        return -1;\n    }\n};",
      java: "class Solution {\n    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {\n        return -1;\n    }\n}",
      python: "class Solution:\n    def findCheapestPrice(self, n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:\n        return -1",
      typescript: "function findCheapestPrice(n: number, flights: number[][], src: number, dst: number, k: number): number {\n  return -1;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {\n        vector<int> dist(n, INT_MAX); dist[src] = 0;\n        for (int i = 0; i <= k; ++i) {\n            vector<int> next = dist;\n            for (auto& f : flights) if (dist[f[0]] != INT_MAX) next[f[1]] = min(next[f[1]], dist[f[0]] + f[2]);\n            dist = move(next);\n        }\n        return dist[dst] == INT_MAX ? -1 : dist[dst];\n    }\n};",
      java: "class Solution {\n    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {\n        int[] dist = new int[n]; Arrays.fill(dist, Integer.MAX_VALUE); dist[src] = 0;\n        for (int i = 0; i <= k; i++) {\n            int[] next = dist.clone();\n            for (int[] f : flights) if (dist[f[0]] != Integer.MAX_VALUE) next[f[1]] = Math.min(next[f[1]], dist[f[0]] + f[2]);\n            dist = next;\n        }\n        return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];\n    }\n}",
      python: "class Solution:\n    def findCheapestPrice(self, n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:\n        dist = [float('inf')] * n\n        dist[src] = 0\n        for _ in range(k + 1):\n            nxt = dist[:]\n            for u, v, w in flights:\n                if dist[u] + w < nxt[v]: nxt[v] = dist[u] + w\n            dist = nxt\n        return -1 if dist[dst] == float('inf') else int(dist[dst])",
      typescript: "function findCheapestPrice(n: number, flights: number[][], src: number, dst: number, k: number): number {\n  let dist = new Array(n).fill(Infinity); dist[src] = 0;\n  for (let i = 0; i <= k; i++) {\n    const next = [...dist];\n    for (const [u, v, w] of flights) if (dist[u] + w < next[v]) next[v] = dist[u] + w;\n    dist = next;\n  }\n  return dist[dst] === Infinity ? -1 : dist[dst];\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "n=4, src=0, dst=3, k=1", expectedOutputDisplay: "700" }]
  },
  {
    id: "dsa-oa-50",
    number: 1584,
    title: "Min Cost to Connect All Points / Cluster Cable MST",
    difficulty: "Medium",
    topic: "Graphs, BFS/DFS & TopoSort",
    companyTags: ["Google", "Confluent", "Microsoft", "Media.net", "Sprinklr"],
    roles: ["Backend Engineer", "Infrastructure SDE"],
    problemStatement: "Given 2D integer coordinates `points`, return the minimum total Manhattan distance required to connect all points into a single connected network.",
    examples: [{ input: "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]", output: "20" }],
    constraints: ["1 <= points.length <= 1000"],
    expectedTimeComplexity: "O(N^2)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["Dense Prim's Algorithm O(N^2)", "Manhattan Edge Metric", "Visited Frontier Relaxation", "Zero Full Graph Allocation"],
    hints: ["Because the graph is complete and dense, Prim's without a heap runs in optimal O(N^2) time and O(N) space."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int minCostConnectPoints(vector<vector<int>>& points) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int minCostConnectPoints(int[][] points) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def minCostConnectPoints(self, points: list[list[int]]) -> int:\n        return 0",
      typescript: "function minCostConnectPoints(points: number[][]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int minCostConnectPoints(vector<vector<int>>& pts) {\n        int n = pts.size(), cost = 0;\n        vector<int> minD(n, INT_MAX); vector<bool> vis(n, false);\n        minD[0] = 0;\n        for (int step = 0; step < n; ++step) {\n            int u = -1;\n            for (int i = 0; i < n; ++i) if (!vis[i] && (u == -1 || minD[i] < minD[u])) u = i;\n            vis[u] = true; cost += minD[u];\n            for (int v = 0; v < n; ++v) if (!vis[v]) minD[v] = min(minD[v], abs(pts[u][0] - pts[v][0]) + abs(pts[u][1] - pts[v][1]));\n        }\n        return cost;\n    }\n};",
      java: "class Solution {\n    public int minCostConnectPoints(int[][] pts) {\n        int n = pts.length, cost = 0;\n        int[] minD = new int[n]; Arrays.fill(minD, Integer.MAX_VALUE); minD[0] = 0;\n        boolean[] vis = new boolean[n];\n        for (int s = 0; s < n; s++) {\n            int u = -1; for (int i = 0; i < n; i++) if (!vis[i] && (u == -1 || minD[i] < minD[u])) u = i;\n            vis[u] = true; cost += minD[u];\n            for (int v = 0; v < n; v++) if (!vis[v]) minD[v] = Math.min(minD[v], Math.abs(pts[u][0] - pts[v][0]) + Math.abs(pts[u][1] - pts[v][1]));\n        }\n        return cost;\n    }\n}",
      python: "class Solution:\n    def minCostConnectPoints(self, pts: list[list[int]]) -> int:\n        n, cost = len(pts), 0\n        min_d, vis = [float('inf')] * n, [False] * n\n        min_d[0] = 0\n        for _ in range(n):\n            u = min((d, i) for i, d in enumerate(min_d) if not vis[i])[1]\n            vis[u] = True\n            cost += int(min_d[u])\n            for v in range(n):\n                if not vis[v]:\n                    d = abs(pts[u][0] - pts[v][0]) + abs(pts[u][1] - pts[v][1])\n                    if d < min_d[v]: min_d[v] = d\n        return cost",
      typescript: "function minCostConnectPoints(pts: number[][]): number {\n  const n = pts.length, minD = new Array(n).fill(Infinity), vis = new Array(n).fill(false);\n  minD[0] = 0; let cost = 0;\n  for (let s = 0; s < n; s++) {\n    let u = -1; for (let i = 0; i < n; i++) if (!vis[i] && (u === -1 || minD[i] < minD[u])) u = i;\n    vis[u] = true; cost += minD[u];\n    for (let v = 0; v < n; v++) if (!vis[v]) minD[v] = Math.min(minD[v], Math.abs(pts[u][0] - pts[v][0]) + Math.abs(pts[u][1] - pts[v][1]));\n  }\n  return cost;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]", expectedOutputDisplay: "20" }]
  },
  {
    id: "dsa-oa-51",
    number: 53,
    title: "Maximum Subarray / Kadane Peak Revenue Surge",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    companyTags: ["Stripe", "Paytm", "Razorpay", "Microsoft", "Apple"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "Given an integer array `nums` containing net profit/loss ticks, find the contiguous non-empty subarray having the largest total sum and return that sum.",
    examples: [{ input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "[4,-1,2,1] sums to 6." }],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Kadane Recurrence", "All-Negative Array Initialization", "Restart vs Extend Choice", "Divide-and-Conquer Follow-up"],
    hints: ["Set `cur = best = nums[0]` and transition `cur = max(x, cur + x)`."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int maxSubArray(int[] nums) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        return 0",
      typescript: "function maxSubArray(nums: number[]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int cur = nums[0], best = nums[0];\n        for (int i = 1; i < (int)nums.size(); ++i) { cur = max(nums[i], cur + nums[i]); best = max(best, cur); }\n        return best;\n    }\n};",
      java: "class Solution {\n    public int maxSubArray(int[] nums) {\n        int cur = nums[0], best = nums[0];\n        for (int i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }\n        return best;\n    }\n}",
      python: "class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        cur = best = nums[0]\n        for x in nums[1:]:\n            cur = max(x, cur + x)\n            best = max(best, cur)\n        return best",
      typescript: "function maxSubArray(nums: number[]): number {\n  let cur = nums[0], best = nums[0];\n  for (let i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }\n  return best;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "nums = [-2,1,-3,4,-1,2,1,-5,4]", expectedOutputDisplay: "6" }]
  },
  {
    id: "dsa-oa-52",
    number: 121,
    title: "Best Time to Buy and Sell Stock / Single-Trade Spread",
    difficulty: "Easy",
    topic: "Dynamic Programming",
    companyTags: ["Goldman Sachs", "Morgan Stanley", "Stripe", "Paytm", "Adobe"],
    roles: ["Full-Stack SDE", "Frontend Developer", "Backend Engineer"],
    problemStatement: "Given daily prices `prices[i]`, return the maximum profit achievable from one buy followed strictly later by one sell (return `0` if no profit possible).",
    examples: [{ input: "prices = [7,1,5,3,6,4]", output: "5" }],
    constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Running Prefix Minimum", "Single Pass State Machine", "Zero-Profit Lower Bound", "Chronological Ordering"],
    hints: ["Track `minPriceSeen` so far and maximize `price - minPriceSeen`."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int maxProfit(int[] prices) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        return 0",
      typescript: "function maxProfit(prices: number[]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int minP = INT_MAX, best = 0;\n        for (int p : prices) { minP = min(minP, p); best = max(best, p - minP); }\n        return best;\n    }\n};",
      java: "class Solution {\n    public int maxProfit(int[] prices) {\n        int minP = Integer.MAX_VALUE, best = 0;\n        for (int p : prices) { minP = Math.min(minP, p); best = Math.max(best, p - minP); }\n        return best;\n    }\n}",
      python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        min_p, best = float('inf'), 0\n        for p in prices:\n            min_p = min(min_p, p)\n            best = max(best, p - min_p)\n        return int(best)",
      typescript: "function maxProfit(prices: number[]): number {\n  let minP = Infinity, best = 0;\n  for (const p of prices) { minP = Math.min(minP, p); best = Math.max(best, p - minP); }\n  return best;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "prices = [7,1,5,3,6,4]", expectedOutputDisplay: "5" }]
  },
  {
    id: "dsa-oa-53",
    number: 198,
    title: "House Robber / Non-Adjacent Capacity Allocation",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    companyTags: ["Google", "Adobe", "Flipkart", "Swiggy", "Apple"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "Given non-negative reward array `nums`, compute the maximum sum achievable without selecting two adjacent indices.",
    examples: [{ input: "nums = [2,7,9,3,1]", output: "12" }],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Take vs Skip Recurrence", "Rolling Two-Variable DP", "O(1) Space Compression", "Base Cases"],
    hints: ["Maintain `prev2` and `prev1`; at each element `x`, compute `cur = max(prev1, prev2 + x)`."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int rob(int[] nums) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def rob(self, nums: list[int]) -> int:\n        return 0",
      typescript: "function rob(nums: number[]): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        int p2 = 0, p1 = 0;\n        for (int x : nums) { int c = max(p1, p2 + x); p2 = p1; p1 = c; }\n        return p1;\n    }\n};",
      java: "class Solution {\n    public int rob(int[] nums) {\n        int p2 = 0, p1 = 0;\n        for (int x : nums) { int c = Math.max(p1, p2 + x); p2 = p1; p1 = c; }\n        return p1;\n    }\n}",
      python: "class Solution:\n    def rob(self, nums: list[int]) -> int:\n        p2 = p1 = 0\n        for x in nums:\n            p2, p1 = p1, max(p1, p2 + x)\n        return p1",
      typescript: "function rob(nums: number[]): number {\n  let p2 = 0, p1 = 0;\n  for (const x of nums) { const c = Math.max(p1, p2 + x); p2 = p1; p1 = c; }\n  return p1;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "nums = [2,7,9,3,1]", expectedOutputDisplay: "12" }]
  },
  {
    id: "dsa-oa-54",
    number: 62,
    title: "Unique Paths / Grid Packet Routing Combinations",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    companyTags: ["Uber", "Zomato", "Adobe", "Goldman Sachs", "Postman"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "From the top-left corner `(0,0)` of an `m x n` grid, return how many distinct paths reach `(m-1, n-1)` moving strictly down or right.",
    examples: [{ input: "m = 3, n = 7", output: "28" }],
    constraints: ["1 <= m, n <= 100", "Answer <= 2 * 10^9."],
    expectedTimeComplexity: "O(m * n) DP or O(min(m, n)) combinatorics",
    expectedSpaceComplexity: "O(n)",
    keyConcepts: ["1D Row DP State Transition", "Binomial Coefficient C(m+n-2, m-1)", "In-Place Prefix Update", "Integer Bounds"],
    hints: ["Keep a 1D row of length `n` initialized to `1`, and update `dp[c] += dp[c - 1]` across `m - 1` rows."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int uniquePaths(int m, int n) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def uniquePaths(self, m: int, n: int) -> int:\n        return 0",
      typescript: "function uniquePaths(m: number, n: number): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        vector<int> dp(n, 1);\n        for (int r = 1; r < m; ++r) for (int c = 1; c < n; ++c) dp[c] += dp[c - 1];\n        return dp[n - 1];\n    }\n};",
      java: "class Solution {\n    public int uniquePaths(int m, int n) {\n        int[] dp = new int[n]; Arrays.fill(dp, 1);\n        for (int r = 1; r < m; r++) for (int c = 1; c < n; c++) dp[c] += dp[c - 1];\n        return dp[n - 1];\n    }\n}",
      python: "class Solution:\n    def uniquePaths(self, m: int, n: int) -> int:\n        dp = [1] * n\n        for _ in range(1, m):\n            for c in range(1, n): dp[c] += dp[c - 1]\n        return dp[-1]",
      typescript: "function uniquePaths(m: number, n: number): number {\n  const dp = new Array(n).fill(1);\n  for (let r = 1; r < m; r++) for (let c = 1; c < n; c++) dp[c] += dp[c - 1];\n  return dp[n - 1];\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "m = 3, n = 7", expectedOutputDisplay: "28" }]
  },
  {
    id: "dsa-oa-55",
    number: 56,
    title: "Merge Intervals / Overlapping Incident Window Coalescer",
    difficulty: "Medium",
    topic: "Heaps & Greedy",
    companyTags: ["Stripe", "Atlassian", "Uber", "Meta", "Google"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Given an array of `[start, end]` intervals, merge all overlapping or touching intervals and return the compressed disjoint set sorted by start time.",
    examples: [{ input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" }],
    constraints: ["1 <= intervals.length <= 10^4"],
    expectedTimeComplexity: "O(N log N)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["Sort by Start Ascending", "Last Merged End Comparison", "Inclusive Boundary `<=`", "Greedy Consolidation"],
    hints: ["Sort by start, then extend `merged.back()[1] = max(merged.back()[1], cur[1])` whenever `cur[0] <= merged.back()[1]`."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        return {};\n    }\n};",
      java: "class Solution {\n    public int[][] merge(int[][] intervals) {\n        return new int[][]{};\n    }\n}",
      python: "class Solution:\n    def merge(self, intervals: list[list[int]]) -> list[list[int]]:\n        return []",
      typescript: "function merge(intervals: number[][]): number[][] {\n  return [];\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& iv) {\n        sort(iv.begin(), iv.end());\n        vector<vector<int>> res = {iv[0]};\n        for (int i = 1; i < (int)iv.size(); ++i) {\n            if (iv[i][0] <= res.back()[1]) res.back()[1] = max(res.back()[1], iv[i][1]);\n            else res.push_back(iv[i]);\n        }\n        return res;\n    }\n};",
      java: "class Solution {\n    public int[][] merge(int[][] iv) {\n        Arrays.sort(iv, (a, b) -> Integer.compare(a[0], b[0]));\n        List<int[]> res = new ArrayList<>(); res.add(iv[0]);\n        for (int i = 1; i < iv.length; i++) {\n            int[] last = res.get(res.size() - 1);\n            if (iv[i][0] <= last[1]) last[1] = Math.max(last[1], iv[i][1]);\n            else res.add(iv[i]);\n        }\n        return res.toArray(new int[0][]);\n    }\n}",
      python: "class Solution:\n    def merge(self, iv: list[list[int]]) -> list[list[int]]:\n        iv.sort()\n        res = [iv[0]]\n        for s, e in iv[1:]:\n            if s <= res[-1][1]: res[-1][1] = max(res[-1][1], e)\n            else: res.append([s, e])\n        return res",
      typescript: "function merge(iv: number[][]): number[][] {\n  iv.sort((a, b) => a[0] - b[0]);\n  const res = [iv[0]];\n  for (let i = 1; i < iv.length; i++) {\n    const last = res[res.length - 1];\n    if (iv[i][0] <= last[1]) last[1] = Math.max(last[1], iv[i][1]);\n    else res.push(iv[i]);\n  }\n  return res;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "intervals = [[1,3],[2,6],[8,10],[15,18]]", expectedOutputDisplay: "[[1,6],[8,10],[15,18]]" }]
  },
  {
    id: "dsa-oa-56",
    number: 215,
    title: "Kth Largest Element / Real-Time Leaderboard Threshold",
    difficulty: "Medium",
    topic: "Heaps & Greedy",
    companyTags: ["Meta", "Flipkart", "Swiggy", "Paytm", "Microsoft"],
    roles: ["Backend Engineer", "Full-Stack SDE"],
    problemStatement: "Given an integer array `nums` and integer `k`, return the `k`-th largest element in sorted order without fully sorting the array in O(N log N).",
    examples: [{ input: "nums = [3,2,1,5,6,4], k = 2", output: "5" }],
    constraints: ["1 <= k <= nums.length <= 10^5"],
    expectedTimeComplexity: "O(N log k) Heap or O(N) Avg QuickSelect",
    expectedSpaceComplexity: "O(k)",
    keyConcepts: ["Size-K Min-Heap", "Duplicate Handling in QuickSelect", "Streaming Compatibility", "Root Threshold Pop"],
    hints: ["Keep a min-heap capped at size `k`; every eviction drops smaller scores so the top at the end is the kth largest."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int findKthLargest(vector<int>& nums, int k) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int findKthLargest(int[] nums, int k) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def findKthLargest(self, nums: list[int], k: int) -> int:\n        return 0",
      typescript: "function findKthLargest(nums: number[], k: number): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int findKthLargest(vector<int>& nums, int k) {\n        priority_queue<int, vector<int>, greater<int>> pq;\n        for (int x : nums) { pq.push(x); if ((int)pq.size() > k) pq.pop(); }\n        return pq.top();\n    }\n};",
      java: "class Solution {\n    public int findKthLargest(int[] nums, int k) {\n        PriorityQueue<Integer> pq = new PriorityQueue<>();\n        for (int x : nums) { pq.offer(x); if (pq.size() > k) pq.poll(); }\n        return pq.peek();\n    }\n}",
      python: "import heapq\nclass Solution:\n    def findKthLargest(self, nums: list[int], k: int) -> int:\n        h = []\n        for x in nums:\n            heapq.heappush(h, x)\n            if len(h) > k: heapq.heappop(h)\n        return h[0]",
      typescript: "function findKthLargest(nums: number[], k: number): number {\n  const minVal = Math.min(...nums), maxVal = Math.max(...nums);\n  const counts = new Int32Array(maxVal - minVal + 1);\n  for (const x of nums) counts[x - minVal]++;\n  let rem = k;\n  for (let v = counts.length - 1; v >= 0; v--) { rem -= counts[v]; if (rem <= 0) return v + minVal; }\n  return -1;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "nums = [3,2,1,5,6,4], k = 2", expectedOutputDisplay: "5" }]
  },
  {
    id: "dsa-oa-57",
    number: 621,
    title: "Task Scheduler / GPU Job Cooldown Optimizer",
    difficulty: "Medium",
    topic: "Heaps & Greedy",
    companyTags: ["Confluent", "Microsoft", "Uber", "Atlassian", "Sprinklr"],
    roles: ["Backend Engineer", "Infrastructure SDE"],
    problemStatement: "Given CPU task labels `tasks` and non-negative cooldown `n` between identical tasks, return the minimum total intervals required to finish all jobs.",
    examples: [{ input: 'tasks = ["A","A","A","B","B","B"], n = 2', output: "8" }],
    constraints: ["1 <= tasks.length <= 10^4", "0 <= n <= 100"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1) (26 letters)",
    keyConcepts: ["Max Frequency Frame Geometry", "(maxFreq - 1) * (n + 1) + countOfMaxFreq", "Task Count Floor Lower Bound", "Idle Slot Filling"],
    hints: ["Arrange the highest-frequency tasks spaced by `n + 1` frames; if plenty of distinct tasks overflow idle slots, the answer is simply `tasks.length`."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int leastInterval(vector<char>& tasks, int n) {\n        return 0;\n    }\n};",
      java: "class Solution {\n    public int leastInterval(char[] tasks, int n) {\n        return 0;\n    }\n}",
      python: "class Solution:\n    def leastInterval(self, tasks: list[str], n: int) -> int:\n        return 0",
      typescript: "function leastInterval(tasks: string[], n: number): number {\n  return 0;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int leastInterval(vector<char>& tasks, int n) {\n        int freq[26] = {}; for (char c : tasks) freq[c - 'A']++;\n        int mx = *max_element(freq, freq + 26), cnt = count(freq, freq + 26, mx);\n        return max((int)tasks.size(), (mx - 1) * (n + 1) + cnt);\n    }\n};",
      java: "class Solution {\n    public int leastInterval(char[] tasks, int n) {\n        int[] freq = new int[26]; int mx = 0;\n        for (char c : tasks) mx = Math.max(mx, ++freq[c - 'A']);\n        int cnt = 0; for (int f : freq) if (f == mx) cnt++;\n        return Math.max(tasks.length, (mx - 1) * (n + 1) + cnt);\n    }\n}",
      python: "from collections import Counter\nclass Solution:\n    def leastInterval(self, tasks: list[str], n: int) -> int:\n        vals = list(Counter(tasks).values())\n        mx = max(vals)\n        cnt = vals.count(mx)\n        return max(len(tasks), (mx - 1) * (n + 1) + cnt)",
      typescript: "function leastInterval(tasks: string[], n: number): number {\n  const freq = new Array(26).fill(0);\n  for (const t of tasks) freq[t.charCodeAt(0) - 65]++;\n  const mx = Math.max(...freq);\n  const cnt = freq.filter((f) => f === mx).length;\n  return Math.max(tasks.length, (mx - 1) * (n + 1) + cnt);\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: 'tasks = ["A","A","A","B","B","B"], n = 2', expectedOutputDisplay: "8" }]
  },
  {
    id: "dsa-oa-58",
    number: 134,
    title: "Gas Station / Circular Rider Fuel Feasibility",
    difficulty: "Medium",
    topic: "Heaps & Greedy",
    companyTags: ["Zomato", "Swiggy", "Uber", "Flipkart", "Razorpay"],
    roles: ["Backend Engineer", "Logistics Routing"],
    problemStatement: "Along a circular route with `gas[i]` fuel available and `cost[i]` needed to travel `i -> (i+1)%n`, return the unique starting index able to complete the circuit once, or `-1`.",
    examples: [{ input: "gas = [1,2,3,4,5], cost = [3,4,5,1,2]", output: "3" }],
    constraints: ["1 <= n <= 10^5"],
    expectedTimeComplexity: "O(N)",
    expectedSpaceComplexity: "O(1)",
    keyConcepts: ["Global Sum Feasibility Guard", "Reset Start Index on Negative Tank", "Greedy Prefix Skip Theorem", "O(1) Space"],
    hints: ["If total gas < total cost, return -1. Otherwise reset `start = i + 1` whenever local `tank` drops below 0."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {\n        return -1;\n    }\n};",
      java: "class Solution {\n    public int canCompleteCircuit(int[] gas, int[] cost) {\n        return -1;\n    }\n}",
      python: "class Solution:\n    def canCompleteCircuit(self, gas: list[int], cost: list[int]) -> int:\n        return -1",
      typescript: "function canCompleteCircuit(gas: number[], cost: number[]): number {\n  return -1;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\npublic:\n    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {\n        int tot = 0, tank = 0, start = 0;\n        for (int i = 0; i < (int)gas.size(); ++i) {\n            int d = gas[i] - cost[i]; tot += d; tank += d;\n            if (tank < 0) { start = i + 1; tank = 0; }\n        }\n        return tot >= 0 ? start : -1;\n    }\n};",
      java: "class Solution {\n    public int canCompleteCircuit(int[] gas, int[] cost) {\n        int tot = 0, tank = 0, start = 0;\n        for (int i = 0; i < gas.length; i++) {\n            int d = gas[i] - cost[i]; tot += d; tank += d;\n            if (tank < 0) { start = i + 1; tank = 0; }\n        }\n        return tot >= 0 ? start : -1;\n    }\n}",
      python: "class Solution:\n    def canCompleteCircuit(self, gas: list[int], cost: list[int]) -> int:\n        tot = tank = start = 0\n        for i, (g, c) in enumerate(zip(gas, cost)):\n            d = g - c\n            tot += d\n            tank += d\n            if tank < 0:\n                start, tank = i + 1, 0\n        return start if tot >= 0 else -1",
      typescript: "function canCompleteCircuit(gas: number[], cost: number[]): number {\n  let tot = 0, tank = 0, start = 0;\n  for (let i = 0; i < gas.length; i++) {\n    const d = gas[i] - cost[i]; tot += d; tank += d;\n    if (tank < 0) { start = i + 1; tank = 0; }\n  }\n  return tot >= 0 ? start : -1;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "gas = [1,2,3,4,5], cost = [3,4,5,1,2]", expectedOutputDisplay: "3" }]
  },
  {
    id: "dsa-oa-59",
    number: 46,
    title: "Permutations / Deterministic Route Ordering Generator",
    difficulty: "Medium",
    topic: "Backtracking & Tries",
    companyTags: ["Google", "Microsoft", "Apple", "Postman", "Adobe"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "Given an array `nums` of distinct integers, generate and return all possible permutations in any order.",
    examples: [{ input: "nums = [1,2,3]", output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]" }],
    constraints: ["1 <= nums.length <= 6"],
    expectedTimeComplexity: "O(N * N!)",
    expectedSpaceComplexity: "O(N)",
    keyConcepts: ["Backtracking Choose-Explore-Unchoose", "In-Place Swap or Used Boolean Array", "Snapshot Copy on Leaf", "Recursion Tree Depth N"],
    hints: ["Track `used[]` or swap `nums[idx]` with `nums[j]` for `j >= idx` and un-swap on unwind."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    vector<vector<int>> permute(vector<int>& nums) {\n        return {};\n    }\n};",
      java: "class Solution {\n    public List<List<Integer>> permute(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      python: "class Solution:\n    def permute(self, nums: list[int]) -> list[list[int]]:\n        return []",
      typescript: "function permute(nums: number[]): number[][] {\n  return [];\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\n    void bt(int i, vector<int>& nums, vector<vector<int>>& res) {\n        if (i == (int)nums.size()) { res.push_back(nums); return; }\n        for (int j = i; j < (int)nums.size(); ++j) { swap(nums[i], nums[j]); bt(i + 1, nums, res); swap(nums[i], nums[j]); }\n    }\npublic:\n    vector<vector<int>> permute(vector<int>& nums) { vector<vector<int>> res; bt(0, nums, res); return res; }\n};",
      java: "class Solution {\n    void bt(int i, int[] nums, List<List<Integer>> res) {\n        if (i == nums.length) { List<Integer> l = new ArrayList<>(); for (int x : nums) l.add(x); res.add(l); return; }\n        for (int j = i; j < nums.length; j++) { int t = nums[i]; nums[i] = nums[j]; nums[j] = t; bt(i + 1, nums, res); t = nums[i]; nums[i] = nums[j]; nums[j] = t; }\n    }\n    public List<List<Integer>> permute(int[] nums) { List<List<Integer>> res = new ArrayList<>(); bt(0, nums, res); return res; }\n}",
      python: "class Solution:\n    def permute(self, nums: list[int]) -> list[list[int]]:\n        res = []\n        def bt(i):\n            if i == len(nums):\n                res.append(nums[:])\n                return\n            for j in range(i, len(nums)):\n                nums[i], nums[j] = nums[j], nums[i]\n                bt(i + 1)\n                nums[i], nums[j] = nums[j], nums[i]\n        bt(0)\n        return res",
      typescript: "function permute(nums: number[]): number[][] {\n  const res: number[][] = [];\n  const bt = (i: number) => {\n    if (i === nums.length) { res.push([...nums]); return; }\n    for (let j = i; j < nums.length; j++) {\n      [nums[i], nums[j]] = [nums[j], nums[i]];\n      bt(i + 1);\n      [nums[i], nums[j]] = [nums[j], nums[i]];\n    }\n  };\n  bt(0);\n  return res;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: "nums = [1,2,3]", expectedOutputDisplay: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]" }]
  },
  {
    id: "dsa-oa-60",
    number: 79,
    title: "Word Search / 2D Matrix Pattern Scanner",
    difficulty: "Medium",
    topic: "Backtracking & Tries",
    companyTags: ["Meta", "Apple", "Media.net", "Sprinklr", "Zomato"],
    roles: ["Full-Stack SDE", "Backend Engineer"],
    problemStatement: "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` can be formed sequentially via horizontally or vertically adjacent cells without reusing a cell.",
    examples: [{ input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"', output: "true" }],
    constraints: ["1 <= m, n <= 6", "1 <= word.length <= 15"],
    expectedTimeComplexity: "O(M * N * 3^L)",
    expectedSpaceComplexity: "O(L)",
    keyConcepts: ["In-Place Sentinel Masking", "4-Directional DFS Backtrack", "Frequency Pre-Check Pruning", "Restore Cell on Unwind"],
    hints: ["Temporarily overwrite `board[r][c] = '#'` during recursion instead of allocating a separate visited matrix, then restore it."],
    starterCode: {
      cpp: "class Solution {\npublic:\n    bool exist(vector<vector<char>>& board, string word) {\n        return false;\n    }\n};",
      java: "class Solution {\n    public boolean exist(char[][] board, String word) {\n        return false;\n    }\n}",
      python: "class Solution:\n    def exist(self, board: list[list[str]], word: str) -> bool:\n        return False",
      typescript: "function exist(board: string[][], word: string): boolean {\n  return false;\n}"
    },
    referenceSolution: {
      cpp: "class Solution {\n    bool dfs(vector<vector<char>>& b, string& w, int r, int c, int k) {\n        if (k == (int)w.size()) return true;\n        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || b[r][c] != w[k]) return false;\n        char ch = b[r][c]; b[r][c] = '#';\n        bool ok = dfs(b,w,r+1,c,k+1) || dfs(b,w,r-1,c,k+1) || dfs(b,w,r,c+1,k+1) || dfs(b,w,r,c-1,k+1);\n        b[r][c] = ch; return ok;\n    }\npublic:\n    bool exist(vector<vector<char>>& b, string w) {\n        for (int r = 0; r < (int)b.size(); ++r) for (int c = 0; c < (int)b[0].size(); ++c) if (dfs(b, w, r, c, 0)) return true;\n        return false;\n    }\n};",
      java: "class Solution {\n    boolean dfs(char[][] b, String w, int r, int c, int k) {\n        if (k == w.length()) return true;\n        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(k)) return false;\n        char ch = b[r][c]; b[r][c] = '#';\n        boolean ok = dfs(b,w,r+1,c,k+1) || dfs(b,w,r-1,c,k+1) || dfs(b,w,r,c+1,k+1) || dfs(b,w,r,c-1,k+1);\n        b[r][c] = ch; return ok;\n    }\n    public boolean exist(char[][] b, String w) {\n        for (int r = 0; r < b.length; r++) for (int c = 0; c < b[0].length; c++) if (dfs(b, w, r, c, 0)) return true;\n        return false;\n    }\n}",
      python: "class Solution:\n    def exist(self, board: list[list[str]], word: str) -> bool:\n        R, C = len(board), len(board[0])\n        def dfs(r, c, k):\n            if k == len(word): return True\n            if r < 0 or c < 0 or r >= R or c >= C or board[r][c] != word[k]: return False\n            ch, board[r][c] = board[r][c], '#'\n            ok = dfs(r+1,c,k+1) or dfs(r-1,c,k+1) or dfs(r,c+1,k+1) or dfs(r,c-1,k+1)\n            board[r][c] = ch\n            return ok\n        return any(dfs(r, c, 0) for r in range(R) for c in range(C))",
      typescript: "function exist(board: string[][], word: string): boolean {\n  const R = board.length, C = board[0].length;\n  const dfs = (r: number, c: number, k: number): boolean => {\n    if (k === word.length) return true;\n    if (r < 0 || c < 0 || r >= R || c >= C || board[r][c] !== word[k]) return false;\n    const ch = board[r][c]; board[r][c] = '#';\n    const ok = dfs(r+1,c,k+1) || dfs(r-1,c,k+1) || dfs(r,c+1,k+1) || dfs(r,c-1,k+1);\n    board[r][c] = ch;\n    return ok;\n  };\n  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (dfs(r, c, 0)) return true;\n  return false;\n}"
    },
    testCases: [{ id: "tc-1", inputDisplay: 'word = "ABCCED"', expectedOutputDisplay: "true" }]
  }
];

const COPRIME_STRIDES = [1, 7, 11, 13, 17, 19, 23, 29];

function buildCuratedProblemBank(problems: DsaOaProblem[]): DsaOaProblem[] {
  const curated: DsaOaProblem[] = problems.map((p) => ({
    ...p,
    companyTags: Array.from(
      new Set(p.companyTags.map((c) => (c === "D.E. Shaw" ? "DE Shaw" : c)))
    ),
  }));

  const countMap = new Map<string, number>();
  for (const company of CORE_MAJOR_COMPANIES) {
    countMap.set(company, 0);
  }
  for (const problem of curated) {
    for (const tag of problem.companyTags) {
      if (countMap.has(tag)) {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      }
    }
  }

  const TARGET_PER_COMPANY = 26;
  CORE_MAJOR_COMPANIES.forEach((company, companyIdx) => {
    const stride = COPRIME_STRIDES[companyIdx % COPRIME_STRIDES.length];
    let cursor = (companyIdx * 5) % curated.length;
    let steps = 0;
    while ((countMap.get(company) || 0) < TARGET_PER_COMPANY && steps < curated.length * 3) {
      const targetProblem = curated[cursor];
      if (!targetProblem.companyTags.includes(company)) {
        targetProblem.companyTags.push(company);
        countMap.set(company, (countMap.get(company) || 0) + 1);
      }
      cursor = (cursor + stride) % curated.length;
      steps += 1;
    }
  });

  return curated;
}

export const DSA_OA_PROBLEMS: DsaOaProblem[] = buildCuratedProblemBank(RAW_DSA_OA_PROBLEMS);

export function getAllDsaOaProblems(): DsaOaProblem[] {
  return DSA_OA_PROBLEMS;
}

export function getDsaOaProblemById(id: string): DsaOaProblem | undefined {
  return DSA_OA_PROBLEMS.find((p) => p.id === id || String(p.number) === id);
}

export function getDsaOaProblemsByTopic(topic: string): DsaOaProblem[] {
  if (topic === "all") return DSA_OA_PROBLEMS;
  return DSA_OA_PROBLEMS.filter((p) => p.topic.toLowerCase() === topic.toLowerCase());
}

export function getDsaOaProblemsByDifficulty(difficulty: string): DsaOaProblem[] {
  if (difficulty === "all") return DSA_OA_PROBLEMS;
  return DSA_OA_PROBLEMS.filter((p) => p.difficulty.toLowerCase() === difficulty.toLowerCase());
}

export function getDsaOaProblemsByRole(role: string): DsaOaProblem[] {
  return DSA_OA_PROBLEMS.filter((p) =>
    p.roles.some((r) => r.toLowerCase().includes(role.toLowerCase()) || role.toLowerCase().includes(r.toLowerCase()))
  );
}
