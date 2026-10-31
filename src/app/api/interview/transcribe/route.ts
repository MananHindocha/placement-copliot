import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const rawGroqKey = process.env.GROQ_API_KEY ?? "";
    const groqKey = rawGroqKey.trim().replace(/^["']|["']$/g, "").trim();

    if (!groqKey || groqKey.startsWith("your_") || groqKey.startsWith("demo_")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Groq API key not configured for Whisper transcription.",
          text: "",
          duration: 0,
          wordsPerMinute: 0,
          source: "unconfigured",
        },
        { status: 200 }
      );
    }

    const fileType = audioFile.type || "audio/webm";
    const extension = fileType.includes("mp4")
      ? "mp4"
      : fileType.includes("wav")
      ? "wav"
      : fileType.includes("ogg")
      ? "ogg"
      : "webm";
    const fileName = `recording.${extension}`;

    const questionContext = String(formData.get("questionContext") || "").trim();
    const role = String(formData.get("role") || "").trim();
    const keyConcepts = String(formData.get("keyConcepts") || "").trim();

    // Prepare native File instance for standard fetch FormData
    const arrayBuffer = await audioFile.arrayBuffer();
    const file = new File([arrayBuffer], fileName, { type: fileType });

    // Technical Jargon Vocabulary Prompt (prevents phonetic STT misspellings like 'use action state' or 'post gres')
    const technicalGlossary = `Technical terms: Next.js, React 19, useActionState, useOptimistic, Server Components, TypeScript, Node.js, FastAPI, PostgreSQL, Supabase, Redis, Kafka, Docker, Kubernetes, REST API, GraphQL, WebSockets, JWT, OAuth, idempotency, p95 latency, Big-O, O(n log n), microservices, CI/CD. Role: ${role || "Software Engineer"}.${keyConcepts ? ` Key Concepts: ${keyConcepts}.` : ""} Context: ${questionContext.slice(0, 300)}`;

    const groqForm = new FormData();
    groqForm.append("file", file);
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("language", "en");
    groqForm.append("response_format", "json");
    groqForm.append("temperature", "0");
    groqForm.append("prompt", technicalGlossary);

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
      body: groqForm,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[Groq Whisper API Notice]:", res.status, errText);
      return NextResponse.json(
        {
          ok: false,
          error: `Whisper transcription failed with status ${res.status}`,
          text: "",
          duration: 0,
          wordsPerMinute: 0,
        },
        { status: 200 }
      );
    }

    const data = (await res.json()) as { text?: string; duration?: number };
    const text = String(data?.text || "").trim();
    const duration = typeof data?.duration === "number" && data.duration > 0 ? data.duration : 1;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const wordsPerMinute = duration > 0 ? Math.round((words / duration) * 60) : 0;

    return NextResponse.json({
      ok: true,
      text,
      duration: Math.round(duration * 10) / 10,
      wordsPerMinute,
      source: "groq-whisper",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal transcription error";
    console.error("[Transcription Error]:", message);
    return NextResponse.json(
      { ok: false, error: message, text: "", duration: 0, wordsPerMinute: 0 },
      { status: 200 }
    );
  }
}
