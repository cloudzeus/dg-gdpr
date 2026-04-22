import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { afm } = await req.json();
  if (!afm || typeof afm !== "string" || !/^\d{9}$/.test(afm.trim())) {
    return NextResponse.json({ error: "Μη έγκυρο ΑΦΜ (9 ψηφία)" }, { status: 400 });
  }

  try {
    const res = await fetch("https://vat.wwa.gr/afm2info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ afm: afm.trim() }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Αποτυχία σύνδεσης με ΓΓΔΕ" }, { status: 502 });
    }

    const data = await res.json();
    const r = data.basic_rec;

    if (!r) {
      return NextResponse.json({ error: "ΑΦΜ δεν βρέθηκε" }, { status: 404 });
    }

    const activities: string[] = [];
    const items = data.firm_act_tab?.item;
    if (items) {
      const list = Array.isArray(items) ? items : [items];
      for (const a of list) {
        activities.push(`${a.firm_act_kind_descr}: ${a.firm_act_descr} (${a.firm_act_code})`);
      }
    }

    return NextResponse.json({
      afm: r.afm,
      name: r.commer_title?.trim() || r.onomasia?.trim() || "",
      legalName: r.onomasia?.trim() || "",
      taxOffice: r.doy_descr?.trim() || "",
      legalStatus: r.legal_status_descr?.trim() || "",
      addressLine1: [r.postal_address, r.postal_address_no].filter(Boolean).join(" ").trim(),
      postalCode: r.postal_zip_code?.trim() || "",
      city: r.postal_area_description?.trim() || "",
      country: "Ελλάδα",
      isActive: r.deactivation_flag === "1",
      registDate: r.regist_date || null,
      activities,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
