import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function getGraphToken(): Promise<string> {
  const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft Entra ID credentials not configured");
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description ?? "Failed to get token");
  return data.access_token;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getGraphToken();

    const res = await fetch(
      "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department&$top=999&$filter=accountEnabled eq true",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message ?? "Graph API error" }, { status: res.status });
    }

    const data = await res.json();
    const users = (data.value ?? []).map((u: any) => ({
      id: u.id,
      name: u.displayName ?? null,
      email: u.mail ?? u.userPrincipalName ?? null,
      jobTitle: u.jobTitle ?? null,
      department: u.department ?? null,
    })).filter((u: any) => u.email);

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
