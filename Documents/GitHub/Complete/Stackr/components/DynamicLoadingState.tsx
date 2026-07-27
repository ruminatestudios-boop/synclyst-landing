"use client";

import { useState, useEffect } from "react";

export type LoadingPhase =
  | "background-removal"
  | "layer-decomposition"
  | "vectorization-vtracer"
  | "vectorization-potrace"
  | "vectorization-clean"
  | "vectorization-fine-detail"
  | "upscaling"
  | "enhancement-restore"
  | "enhancement-recreate";

const PHASE_STEPS: Record<LoadingPhase, string[]> = {
  "background-removal": [
    "Analyzing edge pixels…",
    "Isolating vector paths…",
    "Optimizing SVG curves…",
    "Rendering alpha channel…",
  ],
  "layer-decomposition": [
    "Segmenting image regions…",
    "Detecting element boundaries…",
    "Classifying layer types…",
    "Extracting shape data…",
  ],
  "vectorization-vtracer": [
    "Sampling raster pixels…",
    "Building spline curves…",
    "Optimizing vector nodes…",
    "Refining path smoothness…",
  ],
  "vectorization-potrace": [
    "Tracing edge contours…",
    "Detecting sharp corners…",
    "Converting to bezier paths…",
    "Finalizing vector output…",
  ],
  "vectorization-clean": [
    "Simplifying color regions…",
    "Building shape outlines…",
    "Optimizing path efficiency…",
    "Generating clean SVG…",
  ],
  "vectorization-fine-detail": [
    "Analyzing fine details…",
    "Tracing complex paths…",
    "Preserving micro-details…",
    "Assembling final vector…",
  ],
  "upscaling": [
    "Analyzing source image…",
    "Reconstructing detail…",
    "Enhancing resolution…",
    "Finalizing output…",
  ],
  "enhancement-restore": [
    "Detecting noise patterns…",
    "Applying denoise filter…",
    "Enhancing sharpness…",
    "Stabilizing colors…",
  ],
  "enhancement-recreate": [
    "Analyzing vector opportunities…",
    "Flattening shapes…",
    "Optimizing geometry…",
    "Generating crisp output…",
  ],
};

export function DynamicLoadingState({
  phase,
  progress,
  showProgress = true,
}: {
  phase: LoadingPhase;
  progress: number;
  showProgress?: boolean;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = PHASE_STEPS[phase] || PHASE_STEPS["background-removal"];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="rounded-md border border-[#e1e3e6] bg-[#f7f9fa] p-3">
      <div className="flex items-center justify-between text-xs text-[#63676b]">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#0061fe]" />
          {steps[stepIndex]}
        </span>
        {showProgress && (
          <span className="font-semibold text-[#1e1919]">{progress}%</span>
        )}
      </div>
      {showProgress && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e1e3e6]">
          <div
            className="h-full rounded-full bg-[#0061fe] transition-all"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
