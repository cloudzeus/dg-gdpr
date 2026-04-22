export const dynamic = "force-dynamic";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { MdSecurity, MdLock } from "react-icons/md";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }
      throw err;
    }
  }

  async function signInWithMicrosoft() {
    "use server";
    try {
      await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=MicrosoftSignin");
      }
      throw err;
    }
  }

  const hasMicrosoft = !!(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "#f3f2f1" }}
    >
      <div className="w-full max-w-[440px]">
        {/* App identity */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg mb-4"
            style={{
              background: "rgb(0,120,212)",
              boxShadow: "0 2px 8px rgba(0,120,212,0.3)",
            }}
          >
            <MdSecurity size={28} className="text-white" />
          </div>
          <h1
            className="text-[22px] font-semibold text-center leading-tight"
            style={{ color: "#201f1e" }}
          >
            GDPR Compliance OS
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: "#605e5c" }}>
            DG Smart · Software Houses &amp; ERP Integrators
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-sm bg-white px-8 pt-7 pb-6"
          style={{
            border: "1px solid #edebe9",
            boxShadow:
              "0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)",
          }}
        >
          <h2
            className="text-[20px] font-semibold mb-0.5"
            style={{ color: "#201f1e" }}
          >
            Σύνδεση
          </h2>
          <p className="text-sm mb-5" style={{ color: "#605e5c" }}>
            Συνδεθείτε με τον λογαριασμό σας
          </p>

          <LoginForm
            error={error}
            hasMicrosoft={hasMicrosoft}
            authenticate={authenticate}
            signInWithMicrosoft={signInWithMicrosoft}
          />

          {/* Security note */}
          <div
            className="flex items-center gap-2 text-[11px] mt-4"
            style={{ color: "#a19f9d" }}
          >
            <MdLock size={12} />
            <span>Ασφαλής σύνδεση — κρυπτογραφημένη αποθήκευση κωδικών</span>
          </div>
        </div>

        <p
          className="text-center text-[11px] mt-5"
          style={{ color: "#a19f9d" }}
        >
          © {new Date().getFullYear()} DG Smart · Συμμόρφωση GDPR · Άρθρο 5 GDPR
        </p>
      </div>
    </div>
  );
}
