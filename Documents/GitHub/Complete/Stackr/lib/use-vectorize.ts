"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  VectorizeEngine,
  VectorizeRequest,
  VectorizeResponse,
} from "@/workers/vectorize.worker";

type PresetDef =
  | {
      label: string;
      engine: "imagetracer";
      options: Record<string, unknown>;
    }
  | {
      label: string;
      engine: "potrace";
      options: {
        quantize: Record<string, unknown>;
        potrace: Record<string, unknown>;
      };
    }
  | {
      label: string;
      engine: "vtracer";
      options: {
        preprocess?: Record<string, unknown>;
        quantize: Record<string, unknown>;
        vtracer: Record<string, unknown>;
      };
    };

export const VECTORIZE_PRESETS = {
  vtracer: {
    label: "Balanced (default)",
    engine: "vtracer",
    options: {
      quantize: {
        numberofcolors: 4,
        colorsampling: 0,
        mincolorratio: 0.02,
        colorquantcycles: 4,
        blurradius: 0,
        blurdelta: 20,
      },
      vtracer: {
        mode: "spline",
        cornerThresholdDeg: 75,
        spliceThresholdDeg: 45,
        lengthThreshold: 4,
        maxIterations: 10,
        filterSpeckle: 6,
        pathPrecision: 8,
      },
    },
  },
  potrace: {
    label: "Logos (clean curves)",
    engine: "potrace",
    options: {
      quantize: {
        numberofcolors: 3,
        colorsampling: 0,
        mincolorratio: 0.02,
        colorquantcycles: 4,
        blurradius: 3,
        blurdelta: 20,
      },
      potrace: {
        turnpolicy: "minority",
        turdsize: 2,
        optcurve: true,
        alphamax: 1,
        opttolerance: 0.2,
      },
    },
  },
  "fine-detail": {
    label: "Detail (fine lines & text)",
    engine: "vtracer",
    options: {
      preprocess: {
        applyBlur: false,
        contrastFactor: 1.1,
      },
      quantize: {
        numberofcolors: 6,
        colorsampling: 0,
        mincolorratio: 0.01,
        colorquantcycles: 5,
        blurradius: 1,
        blurdelta: 12,
      },
      vtracer: {
        mode: "spline",
        cornerThresholdDeg: 55,
        spliceThresholdDeg: 40,
        lengthThreshold: 2,
        maxIterations: 10,
        filterSpeckle: 10,
        pathPrecision: 8,
      },
    },
  },
  clean: {
    label: "Flat (solid colors)",
    engine: "imagetracer",
    options: {
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      colorsampling: 0,
      numberofcolors: 8,
      mincolorratio: 0.02,
      colorquantcycles: 3,
      scale: 1,
      roundcoords: 1,
      strokewidth: 0,
      blurradius: 0,
    },
  },
} satisfies Record<string, PresetDef>;

export type VectorizePreset = keyof typeof VECTORIZE_PRESETS;

type LoadingPhase =
  | "vectorization-vtracer"
  | "vectorization-potrace"
  | "vectorization-clean"
  | "vectorization-fine-detail";

type State = {
  status: "idle" | "processing" | "done" | "error";
  svg: string | null;
  error: string | null;
  phase: LoadingPhase | null;
};

let requestId = 0;

export function useVectorize() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, (res: VectorizeResponse) => void>>(
    new Map()
  );
  const [state, setState] = useState<State>({
    status: "idle",
    svg: null,
    error: null,
    phase: null,
  });

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/vectorize.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (event: MessageEvent<VectorizeResponse>) => {
      const handler = pendingRef.current.get(event.data.id);
      handler?.(event.data);
      pendingRef.current.delete(event.data.id);
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const vectorize = useCallback(
    (imageData: ImageData, preset: VectorizePreset = "vtracer") => {
      const worker = workerRef.current;
      if (!worker) return;

      const phaseMap: Record<VectorizePreset, LoadingPhase> = {
        vtracer: "vectorization-vtracer",
        potrace: "vectorization-potrace",
        clean: "vectorization-clean",
        "fine-detail": "vectorization-fine-detail",
      };

      setState({ status: "processing", svg: null, error: null, phase: phaseMap[preset] });
      const id = ++requestId;

      const def = VECTORIZE_PRESETS[preset];
      const message: VectorizeRequest = {
        id,
        imageData,
        engine: def.engine as VectorizeEngine,
        options: def.options as Record<string, unknown>,
      };

      pendingRef.current.set(id, (res) => {
        if (res.ok) {
          setState({ status: "done", svg: res.svg, error: null, phase: null });
        } else {
          setState({ status: "error", svg: null, error: res.error, phase: null });
        }
      });

      worker.postMessage(message);
    },
    []
  );

  const reset = useCallback(() => {
    setState({ status: "idle", svg: null, error: null, phase: null });
  }, []);

  return { ...state, vectorize, reset };
}
