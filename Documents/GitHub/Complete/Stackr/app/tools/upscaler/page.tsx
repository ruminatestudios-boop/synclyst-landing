"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { SwipeCompare } from "@/components/SwipeCompare";
// import { UpgradeModal } from "@/components/UpgradeModal"; // DISABLED FOR DEVELOPMENT
import { fileToImageData, downloadBlob } from "@/lib/image-utils";
import { useUpscaler } from "@/lib/use-upscaler";
import { useUsageLimit } from "@/lib/use-usage-limit";
import { usePro } from "@/lib/pro-context";
import type { UpscaleScale } from "@/lib/upscaler-client";
import { IconUpscale, IconDownload, IconRefresh } from "@/components/icons";

const FREE_LIMIT = 5;

type Source = { dataUrl: string; width: number; height: number; name: string };

export default function UpscalerPage() {
  const { togglePro } = usePro();
  const [original, setOriginal] = useState<Source | null>(null);
  const [scale, setScale] = useState<UpscaleScale>(2);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "compare">("grid");
  const { status, progress, resultDataUrl, backend, error, run, reset } = useUpscaler();
  const usage = useUsageLimit("upscaler", FREE_LIMIT);

  async function handleFile(file: File) {
    reset();
    const { width, height, dataUrl } = await fileToImageData(file);
    setOriginal({ dataUrl, width, height, name: file.name });
  }

  async function handleRun() {
    if (!original) return;
    // DEVELOPMENT MODE: Limit check disabled for testing. Uncomment to re-enable 5-limit.
    // if (usage.limitReached) {
    //   setShowUpgrade(true);
    //   return;
    // }
    const ok = await run(original.dataUrl, scale);
    // if (ok) usage.increment();
  }

  async function handleDownload() {
    if (!resultDataUrl || !original) return;
    const res = await fetch(resultDataUrl);
    const blob = await res.blob();
    const base = original.name.replace(/\.[^.]+$/, "");
    downloadBlob(`${base}-${scale}x.png`, blob);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#0061fe]">
          Free tool
        </span>
        <h1 className="text-3xl font-bold text-[#1e1919]">
          AI Image Upscaler &amp; Enhancer
        </h1>
      </div>
      <p className="mb-8 text-center text-[#63676b]">
        Reconstructs detail and increases resolution with a local AI model —
        runs entirely on your device (WebGPU/WASM/WebGL), nothing is uploaded.
      </p>

      {!original && (
        <Dropzone onFile={handleFile} label="Drop a photo to upscale" />
      )}

      {original && (
        <div className="rounded-xl border border-[#e1e3e6] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-[#e1e3e6] bg-[#f7f9fa] p-1 text-xs">
                <ScaleToggle active={scale === 2} onClick={() => setScale(2)}>
                  2x
                </ScaleToggle>
                <ScaleToggle active={scale === 4} onClick={() => setScale(4)}>
                  4x (larger download)
                </ScaleToggle>
              </div>
              {resultDataUrl && (
                <div className="flex items-center gap-1 rounded-lg border border-[#e1e3e6] bg-[#f7f9fa] p-1 text-xs">
                  <ScaleToggle active={viewMode === "grid"} onClick={() => setViewMode("grid")}>
                    Grid
                  </ScaleToggle>
                  <ScaleToggle active={viewMode === "compare"} onClick={() => setViewMode("compare")}>
                    Compare
                  </ScaleToggle>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#63676b]">
                {usage.remaining} of {FREE_LIMIT} free enhancements left
              </span>
              <button
                type="button"
                onClick={() => {
                  setOriginal(null);
                  reset();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e3e6] bg-white px-3 py-1.5 text-sm font-medium text-[#63676b] transition-colors hover:border-[#63676b] hover:text-[#1e1919]"
              >
                <IconRefresh className="h-4 w-4" />
                New image
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={status === "running"}
                className="inline-flex items-center gap-2 rounded-md bg-[#0061fe] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "running" && <Spinner />}
                Enhance with AI
              </button>
              <button
                type="button"
                disabled={status !== "done"}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e3e6] bg-white px-3 py-1.5 text-sm font-semibold text-[#1e1919] transition-colors hover:border-[#63676b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconDownload className="h-4 w-4" />
                Download Enhanced Photo
              </button>
            </div>
          </div>

          {status === "running" && (
            <div className="mb-4 rounded-md border border-[#e1e3e6] bg-[#f7f9fa] p-3">
              <div className="flex items-center justify-between text-xs text-[#63676b]">
                <span>Enhancing image details with local AI…</span>
                <span className="font-semibold text-[#1e1919]">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e1e3e6]">
                <div
                  className="h-full rounded-full bg-[#0061fe] transition-all"
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>
            </div>
          )}

          {status === "error" && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {viewMode === "compare" && resultDataUrl ? (
            <SwipeCompare
              beforeSrc={original.dataUrl}
              beforeAlt="Original"
              afterSrc={resultDataUrl}
              afterAlt="Enhanced"
              maxHeight="500px"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewPane
                label="Original"
                src={original.dataUrl}
                dimensions={`${original.width}x${original.height}px`}
              />
              <PreviewPane
                label={
                  resultDataUrl && backend
                    ? `Enhanced (${scale}x · ${backend})`
                    : "Enhanced"
                }
                src={resultDataUrl}
                placeholder='Run "Enhance with AI" to see the result here.'
                dimensions={
                  resultDataUrl ? `${original.width * scale}x${original.height * scale}px` : undefined
                }
              />
            </div>
          )}
        </div>
      )}

      {/* DEVELOPMENT MODE: UpgradeModal completely removed for testing */}
    </div>
  );
}

function PreviewPane({
  label,
  src,
  placeholder,
  dimensions,
}: {
  label: string;
  src: string | null;
  placeholder?: string;
  dimensions?: string;
}) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-[#63676b]">
        {label}
      </span>
      <div
        className="relative mt-1.5 flex flex-col items-center justify-center overflow-hidden rounded-lg border border-[#e1e3e6] bg-[repeating-conic-gradient(#f0f2f4_0%_25%,white_0%_50%)] bg-[length:20px_20px]"
        style={{ height: 420 }}
      >
        {src ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label} className="max-h-full max-w-full object-contain" />
            {dimensions && (
              <p className="mt-2 text-xs text-[#63676b]">{dimensions}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <p className="text-center text-xs text-[#63676b]">{placeholder}</p>
            {dimensions && (
              <p className="mt-2 text-xs text-[#63676b]">{dimensions}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScaleToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
        active ? "bg-[#0061fe] text-white" : "text-[#63676b] hover:text-[#1e1919]"
      }`}
    >
      {children}
    </button>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0061fe]/10 text-sm font-semibold text-[#0061fe]">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-[#1e1919]">{title}</h3>
        <p className="mt-0.5 text-sm text-[#63676b]">{description}</p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
