import { NextResponse } from "next/server";
import { getMatches } from "../../../lib/db";

export async function GET() {
  const matches = getMatches();
  return NextResponse.json({ matches, fetchedAt: new Date().toISOString() });
}
