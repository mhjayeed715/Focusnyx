"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncDashboardProfile } from "@/lib/backend";

export default function SignupVerifyPage() {
  const router = useRouter();
  const [emailQuery, setEmailQuery] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    try {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      if (params) {
        setEmailQuery(params.get("email") || "");
          if (params.get("registered") === "1") {
            setSuccess("Verification code sent to your email.");
          }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailQuery) return setError("Missing email address.");
    if (!code.trim()) return setError("Enter the verification code.");

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailQuery,
        token: code.trim(),
        type: "email",
      });

      if (error) {
          setError(error.message);
        return;
      }

      if (data.session?.access_token) {
        try {
          localStorage.setItem("user", data.user?.email || emailQuery);
          const fullName = data.user?.user_metadata?.full_name || data.user?.email?.split("@")[0] || emailQuery.split("@")[0];
          if (fullName) {
            localStorage.setItem("userFullName", fullName);
          }
        } catch (storageError) {
          // ignore
        }

        try {
          await syncDashboardProfile();
        } catch {
          // ignore backend sync failures here; the dashboard reconciles on load.
        }

        router.push("/dashboard");
      } else {
        setError("Verification did not create a session. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fdf2f8_0%,#ffffff_42%,#f8fafc_100%)] px-6 py-8 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[20px] border-2 border-[var(--foreground)] bg-white p-8 shadow-[6px_6px_0_0_#1E293B]">
          <h2 className="text-center font-display text-2xl font-black">Check Your Email</h2>
          
          <div className="mt-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--foreground)] bg-[#06B6D4] shadow-[4px_4px_0_0_#1E293B]">
              <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </div>
          </div>

          {success ? <p className="mt-4 rounded-2xl border-2 border-[var(--foreground)] bg-[#ECFDF5] px-4 py-3 text-center text-sm font-semibold text-[#065F46] shadow-[2px_2px_0_0_#1E293B]">{success}</p> : null}
          <p className="mt-4 text-center text-sm text-[var(--muted-fg)]">We've sent a 6-digit verification code to <strong>{emailQuery || "your email"}</strong>.</p>

          <form onSubmit={handleVerify} className="mt-8 space-y-6">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                    maxLength={1}
                  value={code[index] || ""}
                  onChange={(e) => {
                    const newCode = code.split("");
                    newCode[index] = e.target.value.replace(/[^0-9]/g, "");
                    setCode(newCode.join("").slice(0, 6));
                    if (e.target.value && index < 5) {
                      const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                      nextInput?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !code[index] && index > 0) {
                      const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                      prevInput?.focus();
                    }
                  }}
                  data-index={index}
                  className="h-12 w-12 rounded-[12px] border-2 border-[var(--foreground)] bg-white text-center text-lg font-black shadow-[4px_4px_0_0_#1E293B] outline-none transition focus:translate-y-[-1px]"
                />
              ))}
            </div>
            {error && <div className="text-center text-sm text-red-600">{error}</div>}
            <div className="flex items-center gap-3">
              <button disabled={loading} type="submit" className="candy-button flex h-12 items-center justify-center px-6 text-base font-black">Verify Code</button>
              <button type="button" onClick={() => router.push('/signup')} className="secondary-button h-12 px-4">Start over</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
