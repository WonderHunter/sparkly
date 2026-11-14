import { NextResponse, type NextRequest } from "next/server";
import { ClientError, registerClient, registrationSchema } from "@/lib/agents/clients";
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
    const { client, secret } = await registerClient(parsed.data);
    return NextResponse.json(
      {
        client_id: client.clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
        client_name: client.name,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: client.authMethod,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ClientError) {
      return NextResponse.json(
        { error: error.code, error_description: error.message },
        { status: error.code === "temporarily_unavailable" ? 429 : 400, headers: CORS_HEADERS },
      );
    }
    // Erreur technique (base injoignable…) : journalisée, jamais détaillée au client.
    console.error("Enregistrement d'application impossible :", error);
    return NextResponse.json(
      { error: "server_error", error_description: "Erreur technique côté Sparkly, réessaie dans quelques minutes." },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
