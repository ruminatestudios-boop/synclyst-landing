"use client";

import { useCallback, useState } from "react";
import { deriveBackgroundLayer, type Layer } from "@/lib/layer-compose";

export type DecomposeMode = "auto" | "points";
export type Point = { x: number; y: number; label: 0 | 1 };

type State = {
  status: "idle" | "running" | "done" | "error";
  layers: Layer[];
  error: string | null;
};

export function useDecompose() {
  const [state, setState] = useState<State>({
    status: "idle",
    layers: [],
    error: null,
  });

  const run = useCallback(
    async (
      originalDataUrl: string,
      width: number,
      height: number,
      mode: DecomposeMode,
      points: Point[]
    ) => {
      setState({ status: "running", layers: [], error: null });
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

        setState({ status: "done", layers, error: null });
      } catch (err) {
        setState({
          status: "error",
          layers: [],
          error: err instanceof Error ? err.message : "Decomposition failed.",
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
    setState({ status: "idle", layers: [], error: null });
  }, []);

  return { ...state, run, toggleLayer, reset };
}
