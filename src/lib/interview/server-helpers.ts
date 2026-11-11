import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const GUEST_PERSISTENT_UUID = "00000000-0000-0000-0000-000000000001";
const LOCAL_STORE_PATH = path.join(process.cwd(), ".interview-persistent-store.json");

export type ConfidenceTier = "UNVERIFIED" | "LOW" | "MEDIUM" | "HIGH";
const LADDER: ConfidenceTier[] = ["UNVERIFIED", "LOW", "MEDIUM", "HIGH"];

export const GEMINI_CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

export const GROQ_CANDIDATE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
];

export interface SkillEvidenceLogEntry {
  timestamp: string;
  source: string;
  verdict: "POSITIVE" | "NEGATIVE";
  citation: string;
}

export interface SkillEvidenceRow {
  user_id?: string;
  skill_name: string;
  claimed_level?: "LOW" | "MEDIUM" | "HIGH";
  verified_confidence?: ConfidenceTier;
  bluff_risk?: boolean;
  evidence_log?: SkillEvidenceLogEntry[];
  updated_at?: string;
}

export interface InterviewTurnRecord {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
  interviewerAction?: string;
  skillTested?: string;
}

export interface LocalInterviewSession {
  id: string;
  user_id: string;
  role: string;
  company: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "READY";
  score: number | null;
  topic?: string;
  transcript: unknown[];
  created_at: string;
  updated_at?: string;
}

export interface LocalDsaSession {
  id: string;
  user_id: string;
  role: string;
  topic: string;
  score: number;
  status: string;
  transcript: Array<{ role: string; content: string }>;
  created_at: string;
}

export interface LocalReadinessTask {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: string;
  estimated_hours: number;
  description: string;
  completed: boolean;
  created_at: string;
}

export interface LocalInterviewStore {
  sessions: Record<string, LocalInterviewSession>;
  skillsByUser: Record<string, SkillEvidenceRow[]>;
  tasksByUser: Record<string, LocalReadinessTask[]>;
  dsaSessions: LocalDsaSession[];
}

export function sanitizeEnvKey(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

export function isUsableKey(val: string | undefined, placeholderPrefix: string): val is string {
  const cleaned = sanitizeEnvKey(val);
  return Boolean(
    cleaned &&
      !cleaned.startsWith(placeholderPrefix) &&
      !cleaned.startsWith("demo_") &&
      !cleaned.includes("your_") &&
      cleaned.length >= 10
  );
}

export function getOptionalSupabaseClient(): SupabaseClient | null {
  const url = sanitizeEnvKey(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanitizeEnvKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (!url || !key || url.includes("your-project-id") || key.includes("your-supabase")) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function readLocalInterviewStore(): LocalInterviewStore {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, "utf-8")) as Partial<LocalInterviewStore>;
      return {
        sessions: parsed.sessions ?? {},
        skillsByUser: parsed.skillsByUser ?? {},
        tasksByUser: parsed.tasksByUser ?? {},
        dsaSessions: parsed.dsaSessions ?? [],
      };
    }
  } catch {
    // Fallback cleanly if malformed
  }
  return { sessions: {}, skillsByUser: {}, tasksByUser: {}, dsaSessions: [] };
}

export function writeLocalInterviewStore(store: LocalInterviewStore): void {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Non-fatal in read-only environments
  }
}

export function resolveUserId(rawUserId?: string): { userId: string; isGuest: boolean } {
  const isUuid = Boolean(
    rawUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId)
  );
  if (isUuid && rawUserId !== GUEST_PERSISTENT_UUID) {
    return { userId: rawUserId!, isGuest: false };
  }
  return { userId: GUEST_PERSISTENT_UUID, isGuest: true };
}

export function computeNextConfidence(
  currentTier: ConfidenceTier,
  verdict: "POSITIVE" | "NEGATIVE",
  claimedLevel: "LOW" | "MEDIUM" | "HIGH"
) {
  const idx = Math.max(0, LADDER.indexOf(currentTier));
  const nextIdx =
    verdict === "POSITIVE"
      ? Math.min(LADDER.length - 1, idx + 1)
      : currentTier === "UNVERIFIED"
      ? 1
      : Math.max(1, idx - 1);
  const nextTier = LADDER[nextIdx];
  return {
    previousTier: currentTier,
    nextTier,
    bluffRisk: claimedLevel === "HIGH" && nextTier === "LOW",
  };
}

export function extractJsonObject(rawText: string): string {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned;
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export async function callInterviewLLM(options: {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<{ text: string; provider: "gemini" | "groq" }> {
  const { systemPrompt, userPrompt, temperature = 0.25, timeoutMs = 12000 } = options;
  const geminiKey = sanitizeEnvKey(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  );
  const groqKey = sanitizeEnvKey(process.env.GROQ_API_KEY);
  const errors: string[] = [];

  if (isUsableKey(geminiKey, "placeholder-")) {
    for (const model of GEMINI_CANDIDATE_MODELS) {
      try {
        const payload: Record<string, unknown> = {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature, responseMimeType: "application/json" },
        };
        if (systemPrompt) {
          payload.systemInstruction = { parts: [{ text: systemPrompt }] };
        }
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify(payload),
          }
        );

        if (geminiRes.ok) {
          const json = (await geminiRes.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { text, provider: "gemini" };
        } else {
          errors.push(`gemini/${model}: HTTP ${geminiRes.status}`);
        }
      } catch (err) {
        errors.push(`gemini/${model}: ${err instanceof Error ? err.message : "network error"}`);
      }
    }
  }

  if (isUsableKey(groqKey, "your_")) {
    const messages = systemPrompt
      ? [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]
      : [{ role: "user", content: userPrompt }];

    for (const model of GROQ_CANDIDATE_MODELS) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            temperature,
            response_format: { type: "json_object" },
            messages,
          }),
        });

        if (groqRes.ok) {
          const json = (await groqRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = json.choices?.[0]?.message?.content;
          if (text) return { text, provider: "groq" };
        } else {
          const errBody = await groqRes.text();
          errors.push(`groq/${model}: HTTP ${groqRes.status} ${errBody.slice(0, 120)}`);
        }
      } catch (err) {
        errors.push(`groq/${model}: ${err instanceof Error ? err.message : "network error"}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`LLM_PROVIDER_ERROR: ${errors.join(" | ").slice(0, 350)}`);
  }

  throw new Error(
    "AI_KEY_MISSING: Configure GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) or GROQ_API_KEY in .env.local."
  );
}

