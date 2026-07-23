"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-fill user email and name from Supabase auth session if logged in
  React.useEffect(() => {
    if (!isOpen) return;
    async function loadUser() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          if (user.email) setEmail(user.email);
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
          if (metaName && !name) setName(metaName);
        }
      } catch {}
    }
    void loadUser();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ type: "error", text: "Please fill in your name, email, and message." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({
          type: "success",
          text: "Message sent successfully! We will get back to you shortly.",
        });
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        setStatus({
          type: "error",
          text: data.error || "Failed to send message. Please try again.",
        });
      }
    } catch {
      setStatus({
        type: "error",
        text: "Network error. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[10px_10px_0_0_#1E293B]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[3px_3px_0_0_#1E293B]">
                  <Mail size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <h3 className="font-display text-xl font-black text-[var(--foreground)]">Contact Us</h3>
                  <p className="text-xs font-semibold text-[var(--muted-fg)]">Send a direct message to Focusnyx support</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border-2 border-[var(--foreground)] p-1.5 transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Alert */}
            {status && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-[14px] border-2 p-3 text-xs font-bold ${
                  status.type === "success"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-red-600 bg-red-50 text-red-700"
                }`}
              >
                {status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{status.text}</span>
              </div>
            )}

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-fg)] mb-1">
                    Your Name *
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3.5 py-2.5 text-sm outline-none shadow-[3px_3px_0_0_#1E293B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-fg)] mb-1">
                    Your Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3.5 py-2.5 text-sm outline-none shadow-[3px_3px_0_0_#1E293B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-fg)] mb-1">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Inquiry / Feature Request / Bug Report"
                  className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3.5 py-2.5 text-sm outline-none shadow-[3px_3px_0_0_#1E293B]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-fg)] mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you?"
                  className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3.5 py-2.5 text-sm outline-none shadow-[3px_3px_0_0_#1E293B]"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="secondary-button rounded-[16px] border-2 border-[var(--foreground)] px-5 py-2.5 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="candy-button inline-flex items-center gap-2 rounded-[16px] border-2 border-[var(--foreground)] bg-[#8B5CF6] px-6 py-2.5 text-xs font-black text-white disabled:opacity-60"
                >
                  <Send size={14} />
                  {loading ? "Sending Email..." : "Send Message"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
