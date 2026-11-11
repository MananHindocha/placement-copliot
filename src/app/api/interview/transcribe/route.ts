import { NextRequest, NextResponse } from "next/server";
import {
  GEMINI_CANDIDATE_MODELS,
  isUsableKey,
  sanitizeEnvKey,
} from "@/lib/interview/server-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_WHISPER_MODELS = ["whisper-large-v3-turbo", "whisper-large-v3"];

function buildTranscriptPayload(text: string, durationSeconds: number, source: string) {
  const cleanedText = text.trim();
  const duration = durationSeconds > 0 ? durationSeconds : 1;
  const words = cleanedText ? cleanedText.split(/\s+/).filter(Boolean).length : 0;
  const wordsPerMinute = duration > 0 ? Math.round((words / duration) * 60) : 0;

  return {
    ok: true,
    text: cleanedText,
    transcript: cleanedText,
    duration: Math.round(duration * 10) / 10,
    wordsPerMinute,
    source,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") || formData.get("file");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "Audio file is required (audio/webm, audio/mp4, audio/wav)." },
        { status: 400 }
      );
    }

    const rawMime = audioFile.type || "audio/webm";
    const baseMime = rawMime.split(";")[0]?.trim() || "audio/webm";
    const extension = baseMime.includes("mp4")
      ? "mp4"
      : baseMime.includes("wav")
      ? "wav"
      : baseMime.includes("ogg")
      ? "ogg"
      : "webm";
    const fileName = `recording.${extension}`;

    const questionContext = String(formData.get("questionContext") || "").trim();
    const role = String(formData.get("role") || "").trim();
    const keyConcepts = String(formData.get("keyConcepts") || "").trim();

    const arrayBuffer = await audioFile.arrayBuffer();
    const technicalGlossary = `Technical terms: Next.js, React 19, useActionState, useOptimistic, Server Components, TypeScript, Node.js, FastAPI, PostgreSQL, Supabase, Redis, Kafka, Docker, Kubernetes, REST API, GraphQL, WebSockets, JWT, OAuth, idempotency, p95 latency, Big-O, O(n log n), microservices, CI/CD. Role: ${role || "Software Engineer"}.${keyConcepts ? ` Key Concepts: ${keyConcepts}.` : ""} Context: ${questionContext.slice(0, 300)}`;

    const groqKey = sanitizeEnvKey(process.env.GROQ_API_KEY);
    const geminiKey = sanitizeEnvKey(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
    );
    const errors: string[] = [];

    // 1. Try active Groq Whisper models (turbo first, then large-v3)
    if (isUsableKey(groqKey, "your_")) {
      for (const whisperModel of GROQ_WHISPER_MODELS) {
        try {
          const file = new File([arrayBuffer], fileName, { type: baseMime });
          const groqForm = new FormData();
          groqForm.append("file", file);
          groqForm.append("model", whisperModel);
          groqForm.append("language", "en");
          groqForm.append("response_format", "verbose_json");
          groqForm.append("temperature", "0");
          groqForm.append("prompt", technicalGlossary);

          const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${groqKey}` },
            body: groqForm,
            signal: AbortSignal.timeout(15000),
          });

          if (res.ok) {
            const data = (await res.json()) as { text?: string; duration?: number };
            const text = String(data?.text || "").trim();
            return NextResponse.json(
              buildTranscriptPayload(text, Number(data?.duration) || 1, `groq-${whisperModel}`)
            );
          }

          errors.push(`groq/${whisperModel}: HTTP ${res.status}`);
        } catch (err) {
          errors.push(
            `groq/${whisperModel}: ${err instanceof Error ? err.message : "network error"}`
          );
        }
      }
    }

    // 2. Fallback to active Gemini multimodal audio transcription
    if (isUsableKey(geminiKey, "placeholder-")) {
      const audioBase64 = Buffer.from(arrayBuffer).toString("base64");
      for (const model of GEMINI_CANDIDATE_MODELS) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(15000),
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: `Transcribe the spoken engineering interview audio verbatim in plain text. Preserve technical terms accurately (${technicalGlossary}). Return ONLY the spoken transcript with no commentary.`,
                      },
                      {
                        inlineData: {
                          mimeType: baseMime,
                          data: audioBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: { temperature: 0 },
              }),
            }
          );

          if (geminiRes.ok) {
            const json = (await geminiRes.json()) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const transcriptText = String(
              json.candidates?.[0]?.content?.parts?.[0]?.text || ""
            ).trim();
            if (transcriptText) {
              return NextResponse.json(
                buildTranscriptPayload(transcriptText, 1, `gemini-${model}`)
              );
            }
          } else {
            errors.push(`gemini/${model}: HTTP ${geminiRes.status}`);
          }
        } catch (err) {
          errors.push(`gemini/${model}: ${err instanceof Error ? err.message : "network error"}`);
        }
      }
    }

    if (errors.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Neither GROQ_API_KEY nor GEMINI_API_KEY is configured for audio transcription.",
          text: "",
          transcript: "",
          duration: 0,
          wordsPerMinute: 0,
          source: "unconfigured",
        },
        { status: 200 }
      );
    }

    console.warn("[Audio Transcription Notice]:", errors.join(" | "));
    return NextResponse.json(
      {
        ok: false,
        error: `Transcription failed: ${errors.join(" | ").slice(0, 220)}`,
        text: "",
        transcript: "",
        duration: 0,
        wordsPerMinute: 0,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal transcription error";
    console.error("[Transcription Error]:", message);
    return NextResponse.json(
      { ok: false, error: message, text: "", transcript: "", duration: 0, wordsPerMinute: 0 },
      { status: 200 }
    );
  }
}
