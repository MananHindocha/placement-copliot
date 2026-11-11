import { NextRequest, NextResponse } from "next/server";
import { fetchLiquidSlrCompanyProblems } from "@/lib/interview/company-problems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const company = (req.nextUrl.searchParams.get("company") || "Google").trim();
    const timeframe = (req.nextUrl.searchParams.get("timeframe") || "all").trim();
    const limit = Number(req.nextUrl.searchParams.get("limit") || 50);

    const result = await fetchLiquidSlrCompanyProblems({
      company,
      timeframe,
      limit,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Company CSV not found.",
          problems: [],
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      source: result.source,
      csvUrl: result.csvUrl,
      company: result.company,
      timeframe: result.timeframe,
      totalInRepoForCompany: result.totalInRepoForCompany,
      count: result.problems.length,
      problems: result.problems,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch company problems from GitHub.";
    return NextResponse.json(
      {
        success: false,
        error: message,
        problems: [],
      },
      { status: 500 }
    );
  }
}

