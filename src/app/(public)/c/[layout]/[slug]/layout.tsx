import { resolvePublicTheme } from "@/components/public-themes";

export default async function PublicConsentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ layout: string }>;
}) {
  const { layout } = await params;
  const Theme = resolvePublicTheme(layout);
  return <Theme>{children}</Theme>;
}
