import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/agents/config";
import { protectedResourceMetadata } from "@/lib/agents/resource-metadata";

/** RFC 9728 : métadonnées de la ressource protégée /api/mcp. */
export function GET() {
  return protectedResourceMetadata();
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
