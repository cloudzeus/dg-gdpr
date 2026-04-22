import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDPR Compliance OS | DG Smart",
  description: "Πλατφόρμα συμμόρφωσης GDPR για ολοκληρωτές ERP και software houses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className="h-full">
      <body className="h-full bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
