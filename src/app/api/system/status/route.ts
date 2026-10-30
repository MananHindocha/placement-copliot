import { NextResponse } from "next/server";
import { isSupabaseConfigured, getEffectiveDataMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const isDbConfigured = isSupabaseConfigured();
  const dataMode = getEffectiveDataMode();

  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const isGeminiConfigured = !!geminiKey && !geminiKey.includes("your_gemini");
  const isGroqConfigured = !!groqKey && !groqKey.includes("your_groq");

  const openwebninjaKey = process.env.OPENWEBNINJA_API_KEY;
  const himalayasKey = process.env.HIMALAYAS_API_KEY;
  const isOpenwebninjaConfigured =
    !!openwebninjaKey &&
    !openwebninjaKey.includes("your_openwebninja");
  const isHimalayasConfigured =
    !!himalayasKey &&
    !himalayasKey.includes("your_himalayas");

  const pythonUrl = process.env.PYTHON_PARSER_URL || "http://127.0.0.1:8000";
  let isPythonParserOnline = false;
  let parserDetails = "Offline (using resilient internal buffer extractor)";

  try {
    const res = await fetch(`${pythonUrl}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json();
      isPythonParserOnline = true;
      parserDetails = `Online: ${data.parser || "PyMuPDF + python-docx"}`;
    }
  } catch {
    isPythonParserOnline = false;
  }

  return NextResponse.json({
    database: {
      configured: isDbConfigured,
      mode: dataMode,
      provider: "Supabase PostgreSQL",
      details: isDbConfigured
        ? "Connected with active Row-Level Security (RLS)"
        : "Running in Zero-Config Demo Mode (Local In-Memory Store)",
    },
    aiEngine: {
      configured: isGeminiConfigured || isGroqConfigured,
      geminiActive: isGeminiConfigured,
      groqActive: isGroqConfigured,
      provider: isGeminiConfigured
        ? "Gemini 2.0 Flash"
        : isGroqConfigured
        ? "Groq (Llama 3.3 70B)"
        : "Deterministic Heuristic Engine",
      details: isGeminiConfigured
        ? "Gemini 2.0 Flash connected for live reasoning"
        : isGroqConfigured
        ? "Groq connected for sub-second inference"
        : "Zero API Key Mode: Deterministic XYZ & keyword scoring active",
    },
    jobFeed: {
      configured: isOpenwebninjaConfigured || isHimalayasConfigured,
      openwebninjaActive: isOpenwebninjaConfigured,
      himalayasActive: isHimalayasConfigured,
      details: isOpenwebninjaConfigured && isHimalayasConfigured
        ? "OpenWeb Ninja (India/Global JSearch) + Himalayas Remote active"
        : isOpenwebninjaConfigured
        ? "OpenWeb Ninja (India/Global JSearch) active"
        : isHimalayasConfigured
        ? "Himalayas Remote Jobs API active"
        : "Zero-Config Mode: Curated tech jobs catalog active",
    },
    pythonParser: {
      online: isPythonParserOnline,
      url: pythonUrl,
      details: parserDetails,
    },
  });
}
