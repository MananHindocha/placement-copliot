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

export const DSA_OA_PROBLEMS: DsaOaProblem[] = [
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
  }
];

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
