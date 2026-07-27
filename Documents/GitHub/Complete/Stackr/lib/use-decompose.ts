"use client";

import { useCallback, useState } from "react";
import { deriveBackgroundLayer, type Layer } from "@/lib/layer-compose";

export type DecomposeMode = "auto" | "points";
export type Point = { x: number; y: number; label: 0 | 1 };

type State = {
  status: "idle" | "running" | "done" | "error";
  layers: Layer[];
  error: string | null;
  phase: "layer-decomposition" | null;
  progress: number;
};

export function useDecompose() {
  const [state, setState] = useState<State>({
    status: "idle",
    layers: [],
    error: null,
    phase: null,
    progress: 0,
  });

  const run = useCallback(
    async (
      originalDataUrl: string,
      width: number,
      height: number,
      mode: DecomposeMode,
      points: Point[]
    ) => {
      setState({ status: "running", layers: [], error: null, phase: "layer-decomposition", progress: 5 });

      const progressInterval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          progress: Math.min(90, prev.progress + Math.random() * 20),
        }));
      }, 800);

      try {
        const res = await fetch("/api/decompose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: originalDataUrl,
            width,
            height,
            mode,
            points: mode === "points" ? points : undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? `Request failed (${res.status}).`);
        }

        const aiLayers: Layer[] = json.layers.map(
          (l: { id: string; label: string; imageUrl: string }) => ({
            id: l.id,
            label: l.label,
            imageUrl: l.imageUrl,
            visible: true,
          })
        );

        const subject = aiLayers.find((l) => l.id === "subject");
        const background = subject
          ? await deriveBackgroundLayer(originalDataUrl, subject.imageUrl, width, height)
          : null;

        const layers = [background, ...aiLayers].filter(
          (l): l is Layer => l !== null
        );

        clearInterval(progressInterval);
        setState({ status: "done", layers, error: null, phase: null, progress: 100 });
      } catch (err) {
        clearInterval(progressInterval);
        setState({
          status: "error",
          layers: [],
          error: err instanceof Error ? err.message : "Decomposition failed.",
          phase: null,
          progress: 0,
        });
      }
    },
    []
  );

  const toggleLayer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", layers: [], error: null, phase: null, progress: 0 });
  }, []);

  return { ...state, run, toggleLayer, reset };
}
