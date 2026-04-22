"use client";

import { useState, useTransition, useRef } from "react";
import { updateProfile, uploadAvatar } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FiUser, FiCamera, FiSave, FiEdit2, FiBriefcase, FiPhone, FiMapPin, FiMail } from "react-icons/fi";

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  departmentName: string | null;
  positionTitle: string | null;
  phone: string | null;
  address: string | null;
}

export function ProfileEditor({ user }: { user: ProfileData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);
  const [isPending, startTransition] = useTransition();
  const [avatarPending, setAvatarPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setAvatarPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const result = await uploadAvatar(fd);
      setAvatarPreview(result.image + "?t=" + Date.now());
    } catch (err: any) {
      setError(err.message ?? "Σφάλμα αποστολής");
    } finally {
      setAvatarPending(false);
    }
  };

  const handleSave = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateProfile(formData);
        setSuccess(true);
        setModalOpen(false);
      } catch (err: any) {
        setError(err.message ?? "Σφάλμα αποθήκευσης");
      }
    });
  };

  return (
    <>
      {/* Avatar + info display */}
      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div className="relative group">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={user.name ?? ""}
              className="h-20 w-20 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-border text-primary text-2xl font-bold">
              {user.name?.[0]?.toUpperCase() ?? <FiUser />}
            </div>
          )}
          {/* Upload overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarPending}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white"
            title="Αλλαγή φωτογραφίας"
          >
            {avatarPending ? (
              <span className="text-xs">...</span>
            ) : (
              <FiCamera className="h-5 w-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold truncate">{user.name ?? "—"}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <FiMail className="h-3.5 w-3.5 shrink-0" /> {user.email ?? "—"}
          </p>
          {(user.positionTitle || user.departmentName) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <FiBriefcase className="h-3.5 w-3.5 shrink-0" />
              {[user.positionTitle, user.departmentName].filter(Boolean).join(" · ")}
            </p>
          )}
          {user.phone && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <FiPhone className="h-3.5 w-3.5 shrink-0" /> {user.phone}
            </p>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 shrink-0">
          <FiEdit2 className="h-3.5 w-3.5" /> Επεξεργασία
        </Button>
      </div>

      {success && (
        <p className="text-sm text-green-600 mt-2">✓ Αποθηκεύτηκε</p>
      )}

      {/* Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Επεξεργασία Προφίλ"
        description="Ενημερώστε τα στοιχεία του λογαριασμού σας"
      >
        <form action={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FiUser className="h-3.5 w-3.5" /> Ονοματεπώνυμο
            </label>
            <Input name="name" defaultValue={user.name ?? ""} placeholder="Όνομα Επώνυμο" />
          </div>

          {(user.positionTitle || user.departmentName) && (
            <div className="rounded-lg bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
              <FiBriefcase className="h-3.5 w-3.5 shrink-0" />
              <span>
                Θέση/Τμήμα: <span className="font-medium text-foreground">{[user.positionTitle, user.departmentName].filter(Boolean).join(" · ")}</span>
                <span className="ml-1">— επεξεργασία από διαχειριστή</span>
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <FiPhone className="h-3.5 w-3.5" /> Τηλέφωνο
              </label>
              <Input name="phone" defaultValue={user.phone ?? ""} placeholder="+30 210 0000000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <FiMail className="h-3.5 w-3.5" /> Email (μόνο προβολή)
              </label>
              <Input value={user.email ?? ""} disabled className="opacity-60" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FiMapPin className="h-3.5 w-3.5" /> Διεύθυνση
            </label>
            <Input name="address" defaultValue={user.address ?? ""} placeholder="Οδός, Πόλη, ΤΚ" />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              <FiSave className="h-3.5 w-3.5" />
              {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
