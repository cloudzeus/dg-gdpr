"use client";

import { MdEmail, MdKey } from "react-icons/md";

interface LoginFormProps {
  error?: string;
  hasMicrosoft: boolean;
  authenticate: (formData: FormData) => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
}

export function LoginForm({
  error,
  hasMicrosoft,
  authenticate,
  signInWithMicrosoft,
}: LoginFormProps) {
  return (
    <>
      {/* Microsoft 365 SSO */}
      {hasMicrosoft && (
        <>
          <form action={signInWithMicrosoft} className="mb-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 rounded-sm px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: "#fff",
                border: "1px solid #8a8886",
                color: "#201f1e",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#f3f2f1")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#fff")
              }
            >
              {/* Microsoft logo */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Σύνδεση με Microsoft 365
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "#edebe9" }} />
            <span className="text-xs px-1" style={{ color: "#a19f9d" }}>
              ή με email
            </span>
            <div className="flex-1 h-px" style={{ background: "#edebe9" }} />
          </div>
        </>
      )}

      {/* Credentials form */}
      <form action={authenticate} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-[13px] font-semibold"
            style={{ color: "#201f1e" }}
          >
            Email
          </label>
          <div className="relative">
            <MdEmail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#605e5c" }}
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              className="w-full h-10 rounded-sm bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-[rgb(0,120,212)] focus:ring-1 focus:ring-[rgb(0,120,212)] transition-colors"
              style={{ border: "1px solid #8a8886", color: "#201f1e" }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-[13px] font-semibold"
            style={{ color: "#201f1e" }}
          >
            Κωδικός πρόσβασης
          </label>
          <div className="relative">
            <MdKey
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#605e5c" }}
            />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full h-10 rounded-sm bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-[rgb(0,120,212)] focus:ring-1 focus:ring-[rgb(0,120,212)] transition-colors"
              style={{ border: "1px solid #8a8886", color: "#201f1e" }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-sm px-3 py-2.5 text-[13px] font-medium flex items-start gap-2"
            style={{
              background: "#fde7e9",
              border: "1px solid #d13438",
              color: "#a4262c",
            }}
          >
            <span>⚠</span>
            <span>Λανθασμένο email ή κωδικός πρόσβασης.</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: "rgb(0,120,212)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "rgb(16,110,190)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "rgb(0,120,212)")
          }
        >
          Σύνδεση
        </button>
      </form>
    </>
  );
}
