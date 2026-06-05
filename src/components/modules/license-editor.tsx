"use client";

import { useState, useTransition } from "react";
import { updateLicense } from "@/actions/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiSave } from "react-icons/fi";

export interface LicenseData {
  serialNumber: string | null;
  sellerName: string | null;
  sellerVat: string | null;
  buyerName: string | null;
  buyerVat: string | null;
}

export function LicenseEditor({ license }: { license: LicenseData | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateLicense(formData);
        setSuccess(true);
      } catch (err: any) {
        setError(err.message ?? "Σφάλμα αποθήκευσης");
      }
    });
  };

  return (
    <form action={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Serial Number</label>
        <Input name="serialNumber" defaultValue={license?.serialNumber ?? ""} placeholder="π.χ. DG-2026-0001" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Πωλήτρια — Επωνυμία</label>
          <Input name="sellerName" defaultValue={license?.sellerName ?? ""} placeholder="Επωνυμία" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Πωλήτρια — ΑΦΜ</label>
          <Input name="sellerVat" defaultValue={license?.sellerVat ?? ""} placeholder="ΑΦΜ" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Αγοράστρια — Επωνυμία</label>
          <Input name="buyerName" defaultValue={license?.buyerName ?? ""} placeholder="Επωνυμία" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Αγοράστρια — ΑΦΜ</label>
          <Input name="buyerVat" defaultValue={license?.buyerVat ?? ""} placeholder="ΑΦΜ" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">✓ Αποθηκεύτηκε</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="gap-1.5">
          <FiSave className="h-3.5 w-3.5" /> {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
