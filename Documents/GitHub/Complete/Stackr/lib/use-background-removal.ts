"use client";

import { useCallback, useState } from "react";
import { removeImageBackground } from "@/lib/background-removal-client";

type Status = "idle" | "loading-model" | "processing" | "done" | "error";

type State = {
  status: Status;
  progressLabel: string | null;
  progressPercent: number;
  resultUrl: string | null;
  error: string | null;
  phase: "background-removal" | null;
};

const MODEL_ASSET_KEYS = ["fetch:model", "fetch:wasm", "compute:inference"];

export function useBackgroundRemoval() {
  const [state, setState] = useState<State>({
    status: "idle",
    progressLabel: null,
    progressPercent: 0,
    resultUrl: null,
    error: null,
    phase: null,
  });

  const run = useCallback(async (imageSource: File | Blob | string) => {
    setState({
      status: "loading-model",
      progressLabel: "Loading local AI model…",
      progressPercent: 0,
      resultUrl: null,
      error: null,
      phase: "background-removal",
    });

    try {
      const resultUrl = await removeImageBackground(imageSource, (key, current, total) => {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        const isModelAsset = MODEL_ASSET_KEYS.some((k) => key.includes(k)) || key.includes("fetch");
        setState((s) => ({
          ...s,
          status: isModelAsset && percent < 100 ? "loading-model" : "processing",
          progressLabel: isModelAsset
            ? "Loading local AI model…"
            : "Removing background…",
          progressPercent: percent,
        }));
      });

      setState({
        status: "done",
        progressLabel: null,
        progressPercent: 100,
        resultUrl,
        error: null,
        phase: null,
      });
      return resultUrl;
    } catch (err) {
      setState({
        status: "error",
        progressLabel: null,
        progressPercent: 0,
        resultUrl: null,
        error: err instanceof Error ? err.message : "Background removal failed.",
        phase: null,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      progressLabel: null,
      progressPercent: 0,
      resultUrl: null,
      error: null,
      phase: null,
    });
  }, []);

  return { ...state, run, reset };
}
