import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Download, RefreshCw, FileText, User, Building2,
  Shield, Calendar, Clock, CheckCircle2, ExternalLink, Layers,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { updateDpaContract, regenerateDpaWord } from "@/actions/dpia";
import { DpaRegenButton } from "@/components/modules/dpa-regen-button";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Εκκρεμεί",
  SIGNED: "Υπογεγραμμένη",
  EXPIRED: "Ληγμένη",
  TERMINATED: "Τερματισμένη",
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  PENDING: "warning",
  SIGNED: "success",
  EXPIRED: "destructive",
  TERMINATED: "secondary",
};

async function handleUpdate(formData: FormData) {
  "use server";
  await updateDpaContract(formData);
}

export default async function DpaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const contract = await prisma.dpaContract.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, description: true } },
      user: { select: { name: true } },
    },
  });

  if (!contract) notFound();

  const dataCategories = (contract.dataCategories as string[]) ?? [];
  const purposes = (contract.purposes as string[]) ?? [];
  const subProcessors = (contract.subProcessors as string[]) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle={contract.title}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Header row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link href="/dpia" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Πίσω στη λίστα
            </Link>
            <div className="flex items-center gap-2">
              <DpaRegenButton contractId={id} currentUrl={contract.pdfUrl} />
              {contract.pdfUrl ? (
                <a href={contract.pdfUrl} target="_blank" rel="noreferrer" download>
                  <Button size="sm" className="gap-1.5">
                    <Download className="h-4 w-4" /> Λήψη Word
                  </Button>
                </a>
              ) : (
                <a href={`/api/export/dpa?id=${id}`} download>
                  <Button size="sm" className="gap-1.5">
                    <Download className="h-4 w-4" /> Λήψη Word
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Title card */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg mt-0.5" style={{ background: "rgba(0,120,212,0.1)" }}>
                    <FileText className="h-5 w-5" style={{ color: "#0078d4" }} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">{contract.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {contract.project.name}</span>
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {contract.user.name}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(contract.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[contract.status] ?? "secondary"}>
                  {STATUS_LABELS[contract.status] ?? contract.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Υπεύθυνος Επεξεργασίας (Controller)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold">{contract.controllerName}</p>
                {contract.controllerVat && <p className="text-xs text-muted-foreground">ΑΦΜ: {contract.controllerVat}</p>}
                {contract.controllerAddress && <p className="text-xs text-muted-foreground">{contract.controllerAddress}</p>}
                {contract.controllerRep && <p className="text-xs">Εκπρόσωπος: {contract.controllerRep}</p>}
                {contract.controllerEmail && <p className="text-xs">{contract.controllerEmail}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Εκτελών Επεξεργασία (Processor)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold">{contract.processorName}</p>
                {contract.processorVat && <p className="text-xs text-muted-foreground">ΑΦΜ: {contract.processorVat}</p>}
                {contract.processorAddress && <p className="text-xs text-muted-foreground">{contract.processorAddress}</p>}
                {contract.processorRep && <p className="text-xs">Εκπρόσωπος: {contract.processorRep}</p>}
                {contract.processorEmail && <p className="text-xs">{contract.processorEmail}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Data */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Δεδομένα & Σκοποί Επεξεργασίας
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">ΚΑΤΗΓΟΡΙΕΣ ΔΕΔΟΜΕΝΩΝ</p>
                <div className="flex flex-wrap gap-1.5">
                  {dataCategories.map((c, i) => (
                    <span key={i} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(0,120,212,0.1)", color: "#0078d4", border: "1px solid rgba(0,120,212,0.2)" }}>{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">ΣΚΟΠΟΙ ΕΠΕΞΕΡΓΑΣΙΑΣ</p>
                <ul className="space-y-1">
                  {purposes.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 text-primary shrink-0">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">ΧΡΟΝΟΣ ΔΙΑΤΗΡΗΣΗΣ</p>
                <p className="text-sm">{contract.retentionPeriod}</p>
              </div>
              {subProcessors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">ΥΠΟΕΚΤΕΛΟΥΝΤΕΣ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subProcessors.map((s, i) => (
                      <span key={i} className="rounded-full px-2.5 py-0.5 text-xs bg-secondary text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {contract.safeguards && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">ΜΕΤΡΑ ΑΣΦΑΛΕΙΑΣ</p>
                  <p className="text-sm leading-relaxed">{contract.safeguards}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" /> Τροποποίηση Σύμβασης
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleUpdate} className="space-y-4">
                <input type="hidden" name="id" value={id} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Κατάσταση</label>
                    <Select name="status" defaultValue={contract.status}>
                      <option value="PENDING">Εκκρεμεί</option>
                      <option value="SIGNED">Υπογεγραμμένη</option>
                      <option value="EXPIRED">Ληγμένη</option>
                      <option value="TERMINATED">Τερματισμένη</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Ημερομηνία Υπογραφής</label>
                    <Input
                      type="date"
                      name="signedAt"
                      defaultValue={contract.signedAt ? contract.signedAt.toISOString().slice(0, 10) : ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Λήξη Σύμβασης</label>
                    <Input
                      type="date"
                      name="expiresAt"
                      defaultValue={contract.expiresAt ? contract.expiresAt.toISOString().slice(0, 10) : ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Εκπρόσωπος Controller</label>
                    <Input name="controllerRep" defaultValue={contract.controllerRep ?? ""} placeholder="Ονοματεπώνυμο" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email Controller</label>
                    <Input type="email" name="controllerEmail" defaultValue={contract.controllerEmail ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Εκπρόσωπος Processor</label>
                    <Input name="processorRep" defaultValue={contract.processorRep ?? ""} placeholder="Ονοματεπώνυμο" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email Processor</label>
                    <Input type="email" name="processorEmail" defaultValue={contract.processorEmail ?? ""} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Μέτρα Ασφαλείας</label>
                  <Textarea name="safeguards" defaultValue={contract.safeguards ?? ""} rows={3} placeholder="Τεχνικά & οργανωτικά μέτρα ασφαλείας..." />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Εσωτερικές Σημειώσεις</label>
                  <Textarea name="notes" defaultValue={contract.notes ?? ""} rows={2} placeholder="Σημειώσεις εσωτερικής χρήσης..." />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Αποθήκευση Αλλαγών
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* File info */}
          {contract.pdfUrl && (
            <div className="flex items-center gap-3 rounded-sm px-4 py-3 text-sm" style={{ background: "rgba(16,124,16,0.06)", border: "1px solid rgba(16,124,16,0.2)" }}>
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#107c10" }} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs" style={{ color: "#107c10" }}>Αρχείο Word αποθηκευμένο</p>
                <p className="text-xs text-muted-foreground truncate">{contract.pdfUrl}</p>
              </div>
              <a href={contract.pdfUrl} target="_blank" rel="noreferrer" className="shrink-0">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
