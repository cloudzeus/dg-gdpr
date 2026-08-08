import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Ο ρόλος διαβάζεται από τη βάση, όχι από το JWT: ένα token 30 ημερών θα
  // κρατούσε δικαιώματα διαχειριστή πολύ μετά την ανάκλησή τους.
  if (!(await getAdminUser())) redirect("/dashboard");
  return <>{children}</>;
}
