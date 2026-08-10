// src/app/(app)/intake/[id]/step-documents.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { DocumentUploader } from "./document-uploader";
import type { getIntakeDetail } from "@/actions/intake-ui";

type Intake = Awaited<ReturnType<typeof getIntakeDetail>>["intake"];

const KIND_LABEL: Record<string, string> = {
  CONTRACT: "Σύμβαση",
  OFFER: "Προσφορά",
  ANNEX: "Παράρτημα",
  CORRESPONDENCE: "Αλληλογραφία",
  OTHER: "Άλλο",
};

const OCR_STATUS_LABEL: Record<string, { text: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  PENDING: { text: "Σε αναμονή", variant: "secondary" },
  RUNNING: { text: "Σε ανάγνωση", variant: "default" },
  DONE: { text: "Διαβάστηκε", variant: "success" },
  FAILED: { text: "Απέτυχε", variant: "destructive" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StepDocuments({ intake }: { intake: Intake }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> Έγγραφα
        </CardTitle>
        <CardDescription>
          Ανέβασε τη σύμβαση ή την προσφορά. Το είδος του εγγράφου καθορίζει πώς θα διαβαστεί, οπότε διάλεξέ το σωστά.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {intake.documents.length > 0 && (
          <ul className="space-y-2">
            {intake.documents.map((d) => {
              const status = OCR_STATUS_LABEL[d.ocrStatus] ?? OCR_STATUS_LABEL.PENDING;
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm"
                >
                  <span className="flex-1 min-w-0 truncate">{d.fileName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatBytes(d.sizeBytes)}</span>
                  <Badge variant="outline">{KIND_LABEL[d.kind] ?? d.kind}</Badge>
                  <Badge variant={status.variant}>{status.text}</Badge>
                </li>
              );
            })}
          </ul>
        )}

        <DocumentUploader intakeId={intake.id} />
      </CardContent>
    </Card>
  );
}
