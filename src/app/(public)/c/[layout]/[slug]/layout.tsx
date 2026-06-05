export default function PublicConsentLayout({ children }: { children: React.ReactNode }) {
  // The selected template renders the full self-contained layout; no app chrome.
  return <>{children}</>;
}
