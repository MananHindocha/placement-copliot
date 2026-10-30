import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") || formData.get("file");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required (audio/webm, audio/mp4, audio/wav)." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.includes("your_groq")) {
      return NextResponse.json(
        {
          error: "Groq API key not configured for Whisper transcription.",
          text: "",
          duration: 0,
          wordsPerMinute: 0,
          source: "unconfigured",
        },
        { status: 200 }
      );
    }

    // Prepare FormData for Groq OpenAI-compatible audio transcription API
    const groqForm = new FormData();
    const fileName = (audioFile as any).name || "audio.webm";
    const fileType = audioFile.type || "audio/webm";
    
    // Ensure Blob has proper name and type
    const namedBlob = new Blob([await audioFile.arrayBuffer()], { type: fileType });
    groqForm.append("file", namedBlob, fileName);
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("language", "en");
    groqForm.append("response_format", "verbose_json");
    groqForm.append("temperature", "0.0");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqForm,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("[Groq Whisper API Notice]:", res.status, errText);
      return NextResponse.json(
        {
          error: `Transcription failed with status ${res.status}`,
          text: "",
          duration: 0,
          wordsPerMinute: 0,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = String(data?.text || "").trim();
    const duration = typeof data?.duration === "number" && data.duration > 0 ? data.duration : 1;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const wordsPerMinute = duration > 0 ? Math.round((words / duration) * 60) : 0;

    return NextResponse.json({
      text,
      duration: Math.round(duration * 10) / 10,
      wordsPerMinute,
      source: "groq-whisper",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal transcription error";
    console.error("[Transcription Error]:", message);
    return NextResponse.json({ error: message, text: "", duration: 0, wordsPerMinute: 0 }, { status: 500 });
  }
}

