"use client";

import { useState, useEffect } from "react";

export function EmailCaptureModal({
  isOpen,
  onSubmit,
  onSkip,
  isLoading = false,
}: {
  isOpen: boolean;
  onSubmit: (email: string) => Promise<void>;
  onSkip: () => void;
  isLoading?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setError("");
      setSubmitted(false);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setSubmitted(true);
      await onSubmit(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitted(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[#e1e3e6] bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1e1919]">
            Unlock Your Download
          </h2>
          <button
            type="button"
            onClick={onSkip}
            disabled={isLoading || submitted}
            className="rounded-md p-1 text-[#63676b] text-lg transition-colors hover:bg-[#f7f9fa] hover:text-[#1e1919] disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0061fe]">
          Premium benefit unlocked
        </p>
        <p className="mb-6 text-sm text-[#63676b]">
          Enter your email to instantly download your file in high resolution and
          get 3 free Layer Studio (Pro) exports added to your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || submitted}
              autoComplete="email"
              autoFocus
              className="w-full rounded-lg border border-[#e1e3e6] bg-white px-4 py-2.5 text-sm text-[#1e1919] placeholder-[#99a0a6] transition-colors focus:border-[#0061fe] focus:outline-none focus:ring-1 focus:ring-[#0061fe] disabled:cursor-not-allowed disabled:bg-[#f7f9fa]"
            />
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || submitted || !email}
            className="w-full rounded-lg bg-[#0061fe] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitted ? "Unlocking…" : "Unlock Download"}
          </button>
        </form>

        <button
          type="button"
          onClick={onSkip}
          disabled={isLoading || submitted}
          className="mt-3 w-full text-center text-xs text-[#63676b] transition-colors hover:text-[#1e1919] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download standard resolution (no email needed)
        </button>
      </div>
    </div>
  );
}
