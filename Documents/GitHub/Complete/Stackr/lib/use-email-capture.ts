"use client";

import { useCallback, useEffect, useState } from "react";

type EmailCaptureState = {
  hasOptedIn: boolean;
  email: string | null;
};

const STORAGE_KEY = "stackr_email_opted_in";
const EMAIL_KEY = "stackr_user_email";

export function useEmailCapture() {
  const [state, setState] = useState<EmailCaptureState>({
    hasOptedIn: false,
    email: null,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hasOptedIn = localStorage.getItem(STORAGE_KEY) === "true";
    const email = localStorage.getItem(EMAIL_KEY);
    setState({ hasOptedIn, email });
    setIsHydrated(true);
  }, []);

  const captureEmail = useCallback(async (email: string) => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(EMAIL_KEY, email);
    setState({ hasOptedIn: true, email });

    try {
      const response = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`Failed to capture email (${response.status})`);
      }
    } catch (err) {
      console.error("Email capture error:", err);
    }
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setState({ hasOptedIn: false, email: null });
  }, []);

  return { ...state, captureEmail, reset, isHydrated };
}
