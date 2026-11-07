export interface InterviewRoleMeta {
  title: string;
  slug: string;
  category: string;
  description: string;
  accent: "indigo" | "cyan" | "blue" | "purple" | "sky" | "rose" | "amber" | "emerald" | "violet";
  iconName: string;
  tags: string[];
}

export const QUESTION_BANK_ROLES: InterviewRoleMeta[] = [
  {
    title: "Full-Stack SDE",
    slug: "full-stack-sde",
    category: "Full-Stack Architecture",
    description: "Modern web architecture, frontend frameworks, backend APIs, microservices, and end-to-end engineering trade-offs.",
    accent: "indigo",
    iconName: "Layers",
    tags: ["React/Next.js", "Node/Go", "RSC & Hydration", "System Design"],
  },
  {
    title: "Frontend Developer",
    slug: "frontend-developer",
    category: "Web & UI Engineering",
    description: "UI performance, React/Next.js rendering, component state, accessibility, DOM optimization, and CSS layout engines.",
    accent: "cyan",
    iconName: "Layout",
    tags: ["React 19", "Core Web Vitals", "State Machines", "Accessibility"],
  },
  {
    title: "Backend Engineer",
    slug: "backend-engineer",
    category: "Distributed Systems",
    description: "Distributed systems, database design, caching layers, concurrency, async queues, and high-throughput REST/gRPC APIs.",
    accent: "blue",
    iconName: "Server",
    tags: ["Microservices", "PostgreSQL", "Kafka & Redis", "Concurreny"],
  },
  {
    title: "ML/Data Engineer",
    slug: "ml-data-engineer",
    category: "AI & Machine Learning",
    description: "Model training pipelines, feature stores, ETL workflows, vector embeddings, inference optimization, and PyTorch/TensorFlow.",
    accent: "purple",
    iconName: "Brain",
    tags: ["LLM Pipelines", "Vector DBs", "PyTorch", "Feature Stores"],
  },
  {
    title: "DevOps & Cloud Engineer",
    slug: "devops-cloud-engineer",
    category: "Cloud & Automation",
    description: "CI/CD pipelines, Docker containerization, Kubernetes orchestration, Infrastructure as Code, and AWS/GCP cloud environments.",
    accent: "sky",
    iconName: "Cloud",
    tags: ["Kubernetes", "Terraform", "CI/CD Actions", "Docker"],
  },
  {
    title: "Cloud / SRE",
    slug: "cloud-sre",
    category: "Reliability & Systems",
    description: "Site reliability engineering, observability, SLA/SLO metrics, incident root-cause analysis, and disaster recovery.",
    accent: "rose",
    iconName: "Activity",
    tags: ["SLO/SLA Metrics", "Prometheus", "Incident RCA", "Chaos Eng"],
  },
  {
    title: "Data Analyst",
    slug: "data-analyst",
    category: "Analytics & Insights",
    description: "SQL queries, data visualization, business intelligence metrics, statistical inference, and cohort retention analysis.",
    accent: "amber",
    iconName: "BarChart3",
    tags: ["Advanced SQL", "Cohort Retention", "A/B Testing", "BI Dashboards"],
  },
  {
    title: "Mobile App Developer",
    slug: "mobile-app-developer",
    category: "Mobile Platforms",
    description: "Native & cross-platform mobile apps (React Native/Flutter/iOS/Android), memory leaks, offline sync, and app lifecycle.",
    accent: "emerald",
    iconName: "Smartphone",
    tags: ["React Native", "Flutter", "Offline Sync", "Memory Leaks"],
  },
  {
    title: "Cybersecurity & Systems Engineer",
    slug: "cybersecurity-systems-engineer",
    category: "Security & Systems",
    description: "Application security, OWASP vulnerabilities, threat modeling, network protocols, zero-trust auth, and system hardening.",
    accent: "violet",
    iconName: "ShieldAlert",
    tags: ["OWASP Top 10", "Zero-Trust", "Threat Modeling", "Auth Protocols"],
  },
];

export const ROLE_SLUG_TO_TITLE: Record<string, string> = {
  "full-stack-sde": "Full-Stack SDE",
  "frontend-developer": "Frontend Developer",
  "backend-engineer": "Backend Engineer",
  "ml-data-engineer": "ML/Data Engineer",
  "devops-cloud-engineer": "DevOps & Cloud Engineer",
  "cloud-sre": "Cloud / SRE",
  "data-analyst": "Data Analyst",
  "mobile-app-developer": "Mobile App Developer",
  "cybersecurity-systems-engineer": "Cybersecurity & Systems Engineer",
};

export function getRoleBySlug(slug: string): InterviewRoleMeta | undefined {
  const normalized = slug.trim().toLowerCase();
  return QUESTION_BANK_ROLES.find((r) => r.slug.toLowerCase() === normalized);
}

