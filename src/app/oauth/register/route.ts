import { NextResponse, type NextRequest } from "next/server";
import { registerClient, registrationSchema } from "@/lib/agents/clients";
import { CORS_HEADERS } from "@/lib/agents/config";

/** Enregistrement dynamique de client (RFC 7591), en repli des documents de métadonnées. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Métadonnées d'application invalides." },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  try {
    const client = await registerClient(parsed.data);
    return NextResponse.json(
      {
        client_id: client.clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: client.name,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (error) {
    const [code, description] = (error as Error).message.split(": ");
    return NextResponse.json(
      { error: description ? code : "invalid_client_metadata", error_description: description ?? code },
      { status: code === "temporarily_unavailable" ? 429 : 400, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
