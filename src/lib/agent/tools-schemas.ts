/**
 * Placement Co-pilot: Agent Tool Schemas & Function Declarations (Track 1)
 *
 * Provides runtime Zod validation schemas and @google/generative-ai
 * FunctionDeclaration definitions for all 6 autonomous agent tools.
 */

import { z } from "zod";

// ─── Zod Schemas for Runtime Argument Validation ─────────────────────────────
export const ToolSchemas = {
  get_student_twin_context: z.object({
    forceRefresh: z.boolean().optional().default(false),
  }),

  analyze_job_gap: z.object({
    jobId: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
  }),

  optimize_multi_company_overlap: z.object({
    activeApplicationIds: z.array(z.string()).optional(),
  }),

  update_skill_evidence: z.object({
    skill: z.string().min(1, "Skill name is required"),
    score: z.number().min(0).max(100),
    evidenceSource: z.string().optional().default("Mock Interview Assessment"),
    citation: z.string().optional(),
  }),

  inject_readiness_sprint: z.object({
    title: z.string().min(1, "Sprint title is required"),
    durationDays: z.number().int().min(1).max(14).default(3),
    tasks: z
      .array(
        z.object({
          day: z.number().int().min(1),
          title: z.string().min(1),
          skill: z.string().min(1),
          reason: z.string().min(1),
        })
      )
      .min(1, "At least one daily task is required"),
  }),

  stage_resume_diff: z.object({
    applicationId: z.string().optional(),
    roleTarget: z.string().min(1, "Role target is required"),
    summary: z.string().min(1, "Summary is required"),
    suggestedAdditions: z.array(z.string()).default([]),
    suggestedKeywords: z.array(z.string()).default([]),
    highlightedProjects: z.array(z.string()).default([]),
  }),
};

// Types inferred from Zod schemas
export type GetStudentTwinContextArgs = z.infer<typeof ToolSchemas.get_student_twin_context>;
export type AnalyzeJobGapArgs = z.infer<typeof ToolSchemas.analyze_job_gap>;
export type OptimizeMultiCompanyOverlapArgs = z.infer<typeof ToolSchemas.optimize_multi_company_overlap>;
export type UpdateSkillEvidenceArgs = z.infer<typeof ToolSchemas.update_skill_evidence>;
export type InjectReadinessSprintArgs = z.infer<typeof ToolSchemas.inject_readiness_sprint>;
export type StageResumeDiffArgs = z.infer<typeof ToolSchemas.stage_resume_diff>;

// ─── Gemini 2.0 Flash Function Declarations ──────────────────────────────────
export const AGENT_FUNCTION_DECLARATIONS = [
  {
    name: "get_student_twin_context",
    description:
      "Hydrates and retrieves the comprehensive Career Digital Twin context for the candidate, including verified skills, bluff risks, active applications, and interview weaknesses.",
    parameters: {
      type: "OBJECT",
      properties: {
        forceRefresh: {
          type: "BOOLEAN",
          description: "Whether to bypass cached twin context and force fresh database retrieval.",
        },
      },
    },
  },
  {
    name: "analyze_job_gap",
    description:
      "Fetches target job requirements and compares against candidate skill evidence matrix, classifying skills into verified matches, bluff risks, unverified claims, or missing skills.",
    parameters: {
      type: "OBJECT",
      properties: {
        jobId: { type: "STRING", description: "Target job application ID or catalog listing ID" },
        company: { type: "STRING", description: "Target company name (e.g. Stripe, Google, Notion)" },
        role: { type: "STRING", description: "Target role title (e.g. Software Engineer, Backend Engineer)" },
      },
    },
  },
  {
    name: "optimize_multi_company_overlap",
    description:
      "Runs a deterministic Greedy Weighted Set-Cover algorithm across active job applications in the Kanban pipeline to find high-yield overlapping skills.",
    parameters: {
      type: "OBJECT",
      properties: {
        activeApplicationIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description:
            "List of application IDs to compare. If omitted, evaluates all active applications in Applied, Phone Screen, and Interview stages.",
        },
      },
    },
  },
  {
    name: "update_skill_evidence",
    description:
      "Calibrates skill verified confidence in the candidate's skill evidence matrix with empirical proof citations and interview telemetry.",
    parameters: {
      type: "OBJECT",
      properties: {
        skill: { type: "STRING", description: "Target skill name to calibrate" },
        score: { type: "NUMBER", description: "Evaluation score achieved (0-100)" },
        evidenceSource: { type: "STRING", description: "Source description (e.g. Mock Interview Telemetry)" },
        citation: { type: "STRING", description: "Specific verbatim proof, question context, or metric" },
      },
      required: ["skill", "score"],
    },
  },
  {
    name: "inject_readiness_sprint",
    description:
      "Injects structured preparation milestones and daily sprint tasks into the candidate's readiness plan targeting specific gaps.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Sprint title (e.g. 3-Day Technical Sprint: Stripe Backend)" },
        durationDays: { type: "NUMBER", description: "Sprint duration in days (typically 2-4)" },
        tasks: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              day: { type: "NUMBER", description: "Sprint day (1, 2, 3...)" },
              title: { type: "STRING", description: "Specific task title" },
              skill: { type: "STRING", description: "Skill targeted" },
              reason: { type: "STRING", description: "Concrete evidence reason for this milestone" },
            },
            required: ["day", "title", "skill", "reason"],
          },
          description: "List of actionable daily sprint tasks",
        },
      },
      required: ["title", "tasks"],
    },
  },
  {
    name: "stage_resume_diff",
    description:
      "Proposes evidence-grounded modifications to the candidate's resume for human-in-the-loop approval before committing.",
    parameters: {
      type: "OBJECT",
      properties: {
        applicationId: { type: "STRING", description: "Target job application ID" },
        roleTarget: { type: "STRING", description: "Role and company title for the tailored resume" },
        summary: { type: "STRING", description: "Executive summary of proposed adjustments" },
        suggestedAdditions: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Bullet point enhancements reflecting verified skills",
        },
        suggestedKeywords: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Verified industry keywords to emphasize",
        },
        highlightedProjects: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Candidate projects aligned with company tech stack",
        },
      },
      required: ["roleTarget", "summary", "suggestedKeywords"],
    },
  },
];

