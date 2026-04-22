"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteDpia, deleteDpa } from "@/actions/dpia";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteDpiaButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Διαγραφή αυτής της DPIA; Η ενέργεια δεν αναιρείται.")) return;
        startTransition(async () => {
          await deleteDpia(id);
          router.refresh();
        });
      }}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
    </Button>
  );
}

export function DeleteDpaButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Διαγραφή αυτής της σύμβασης DPA; Η ενέργεια δεν αναιρείται.")) return;
        startTransition(async () => {
          await deleteDpa(id);
          router.refresh();
        });
      }}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
    </Button>
  );
}
