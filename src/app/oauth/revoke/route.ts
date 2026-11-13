import { NextResponse, type NextRequest } from "next/server";
import { CORS_HEADERS } from "@/lib/agents/config";
import { revokeToken } from "@/lib/agents/tokens";

/** Révocation par l'application (RFC 7009) : répond 200 même pour un jeton inconnu. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  if (typeof token === "string" && token.length > 0) await revokeToken(token);
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
