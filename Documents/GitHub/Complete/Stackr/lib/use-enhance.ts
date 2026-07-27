"use client";

import { useCallback, useState } from "react";
import type { RecreateSubject } from "@/lib/fal-client";

export type EnhanceMode = "restore" | "recreate";
export type { RecreateSubject };

type LoadingPhase = "enhancement-restore" | "enhancement-recreate";

type State = {
  status: "idle" | "running" | "done" | "error";
  error: string | null;
  mode: EnhanceMode | null;
  phase: LoadingPhase | null;
};

export function useEnhance() {
  const [state, setState] = useState<State>({
    status: "idle",
    error: null,
    mode: null,
    phase: null,
  });

  const run = useCallback(
    async (
      imageDataUrl: string,
      mode: EnhanceMode,
      fidelity?: number,
      subject?: RecreateSubject
    ): Promise<string | null> => {
      const phaseMap: Record<EnhanceMode, LoadingPhase> = {
        restore: "enhancement-restore",
        recreate: "enhancement-recreate",
      };
      setState({ status: "running", error: null, mode, phase: phaseMap[mode] });
      try {
        const res = await fetch("/api/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: imageDataUrl, mode, fidelity, subject }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? `Request failed (${res.status}).`);
        }
        setState({ status: "done", error: null, mode, phase: null });
        return json.imageBase64 as string;
      } catch (err) {
        setState({
          status: "error",
          error: err instanceof Error ? err.message : "Enhancement failed.",
          mode,
          phase: null,
        });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ status: "idle", error: null, mode: null, phase: null });
  }, []);

  return { ...state, run, reset };
}
