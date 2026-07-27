"use client";

import { useCallback, useState } from "react";
import { upscaleImage, type UpscaleScale } from "@/lib/upscaler-client";

type State = {
  status: "idle" | "running" | "done" | "error";
  progress: number;
  resultDataUrl: string | null;
  backend: string | null;
  error: string | null;
  phase: "upscaling" | null;
};

export function useUpscaler() {
  const [state, setState] = useState<State>({
    status: "idle",
    progress: 0,
    resultDataUrl: null,
    backend: null,
    error: null,
    phase: null,
  });

  const run = useCallback(async (imageDataUrl: string, scale: UpscaleScale) => {
    setState({ status: "running", progress: 0, resultDataUrl: null, backend: null, error: null, phase: "upscaling" });
    try {
      const { dataUrl, backend } = await upscaleImage(imageDataUrl, scale, (percent) => {
        setState((s) => ({ ...s, progress: percent }));
      });
      setState({ status: "done", progress: 100, resultDataUrl: dataUrl, backend, error: null, phase: null });
      return dataUrl;
    } catch (err) {
      setState({
        status: "error",
        progress: 0,
        resultDataUrl: null,
        backend: null,
        error: err instanceof Error ? err.message : "Upscaling failed.",
        phase: null,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", progress: 0, resultDataUrl: null, backend: null, error: null, phase: null });
  }, []);

  return { ...state, run, reset };
}
