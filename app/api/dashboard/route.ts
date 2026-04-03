import { NextRequest, NextResponse } from "next/server";
import { getDashboardPayload, normalizeFiltersFromSearchParams } from "@/lib/dashboard-data";

export async function GET(request: NextRequest) {
  const filters = normalizeFiltersFromSearchParams(request.nextUrl.searchParams);
  const payload = await getDashboardPayload(filters);

  return NextResponse.json(payload);
}
