import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToBunny } from "@/lib/bunny";
import { saveSignedDocUrl } from "@/actions/dpia";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const id   = form.get("id") as string;
  const type = form.get("type") as "dpia" | "dpa";

  if (!file || !id || !type) {
    return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const remotePath = `signed/${type}/${id}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const url = await uploadToBunny(buffer, remotePath, file.type || "application/octet-stream");
  await saveSignedDocUrl(id, type, url);

  return NextResponse.json({ url });
}
