"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { LayerEditor } from "@/components/LayerEditor";
import { DynamicLoadingState } from "@/components/DynamicLoadingState";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
import { fileToImageData } from "@/lib/image-utils";
import { usePro } from "@/lib/pro-context";
import { takePendingFile } from "@/lib/pending-upload";
import { useRights } from "@/lib/rights-context";
import { RightsCheckbox } from "@/components/RightsCheckbox";
import { useDecompose, type Point } from "@/lib/use-decompose";
import { useEmailCapture } from "@/lib/use-email-capture";
import { exportLayersAsPsd } from "@/lib/psd-export";
import { exportLayersAsPdf } from "@/lib/pdf-export";
import { IconLayers, IconDownload, IconRefresh } from "@/components/icons";

const DISPLAY_MAX_WIDTH = 560;

export default function LayerStudioPage() {
  const { isPro, togglePro } = usePro();
  const { acknowledged } = useRights();
  const [original, setOriginal] = useState<{
    dataUrl: string;
    width: number;
    height: number;
    name: string;
  } | null>(null);
  const [mode, setMode] = useState<"auto" | "points">("auto");
  const [points, setPoints] = useState<Point[]>([]);
  const [exporting, setExporting] = useState<"psd" | "pdf" | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<"psd" | "pdf" | null>(null);
  const { status, layers, error, run, toggleLayer, reset, phase, progress } = useDecompose();
  const { hasOptedIn, captureEmail, isHydrated } = useEmailCapture();

  const displaySize = useMemo(() => {
    if (!original) return { width: 0, height: 0 };
    const w = Math.min(DISPLAY_MAX_WIDTH, original.width);
    const h = w * (original.height / original.width);
    return { width: w, height: h };
  }, [original]);

  async function handleFile(file: File) {
    reset();
    setPoints([]);
    const { width, height, dataUrl } = await fileToImageData(file);
    setOriginal({ dataUrl, width, height, name: file.name });
  }

  // Picks up a file sent from the homepage hero or the static marketing
  // site's tool picker, if any, and enables Pro so the tool is usable
  // immediately instead of landing on the gate screen. Only runs once, on mount.
  useEffect(() => {
    takePendingFile().then((file) => {
      if (!file) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!isPro) togglePro();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleFile(file);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!original || mode !== "points" || status === "running") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratioX = (e.clientX - rect.left) / rect.width;
      const ratioY = (e.clientY - rect.top) / rect.height;
      const label: 0 | 1 = e.shiftKey ? 0 : 1;
      setPoints((prev) => [
        ...prev,
        {
          x: Math.round(ratioX * original.width),
          y: Math.round(ratioY * original.height),
          label,
        },
      ]);
    },
    [original, mode, status]
  );

  function handleAutoDecompose() {
    if (!original || !acknowledged) return;
    run(original.dataUrl, original.width, original.height, "auto", []);
  }

  function handleSegmentSelection() {
    if (!original || !acknowledged || points.length === 0) return;
    run(original.dataUrl, original.width, original.height, "points", points);
  }

  function handleExportClick(type: "psd" | "pdf") {
    if (!isHydrated) return;

    if (!hasOptedIn) {
      setPendingExportType(type);
      setShowEmailModal(true);
    } else {
      performExport(type);
    }
  }

  async function handleEmailSubmit(email: string) {
    await captureEmail(email);
    if (pendingExportType) {
      await performExport(pendingExportType);
    }
    setShowEmailModal(false);
    setPendingExportType(null);
  }

  function handleSkipEmail() {
    setShowEmailModal(false);
    setPendingExportType(null);
  }

  async function performExport(type: "psd" | "pdf") {
    if (!original) return;
    setExporting(type);
    const base = original.name.replace(/\.[^.]+$/, "");
    try {
      if (type === "psd") {
        await exportLayersAsPsd(layers, original.width, original.height, `${base}.psd`);
      } else {
        await exportLayersAsPdf(layers, original.width, original.height, `${base}.pdf`);
      }
    } finally {
      setExporting(null);
    }
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <span className="inline-block text-sm font-bold uppercase tracking-widest text-[#0061fe] mb-6">
              Pro Tool
            </span>
            <h1 className="text-6xl md:text-7xl font-black text-[#1e1919] leading-tight mb-8">
              Layer Studio
            </h1>
            <p className="text-xl md:text-2xl text-[#63676b] max-w-3xl mx-auto leading-relaxed">
              Automatically split flat files and vectors into organized, production-ready design stacks for screen printing and editing.
            </p>
          </div>
          <div className="text-center mt-16">
            <button
              type="button"
              onClick={togglePro}
              className="rounded-lg bg-[#0061fe] px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-[#0050d0]"
            >
              Enable Pro (demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <span className="inline-block text-sm font-bold uppercase tracking-widest text-[#0061fe] mb-6">
            Pro Tool
          </span>
          <h1 className="text-6xl md:text-7xl font-black text-[#1e1919] leading-tight mb-8">
            Layer Studio
          </h1>
          <p className="text-xl md:text-2xl text-[#63676b] max-w-3xl mx-auto leading-relaxed">
            Automatically split flat files and vectors into organized, production-ready design stacks for screen printing and editing.
          </p>
        </div>

        <div className="mt-24">
          {!original && (
            <Dropzone
              onFile={handleFile}
              label="Drop a complex graphic to decompose"
              hint="or click to browse — PNG, JPG, WEBP"
            />
          )}

          {original && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-[#e1e3e6] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-[#e1e3e6] bg-[#f7f9fa] p-1">
                <ModeToggle active={mode === "auto"} onClick={() => setMode("auto")}>
                  Auto
                </ModeToggle>
                <ModeToggle
                  active={mode === "points"}
                  onClick={() => setMode("points")}
                >
                  Point select
                </ModeToggle>
              </div>

              <div className="flex items-center gap-2">
                {mode === "points" && points.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPoints([])}
                    className="rounded-md border border-[#e1e3e6] bg-white px-3 py-1.5 text-sm font-medium text-[#63676b] hover:border-[#63676b]"
                  >
                    Clear points ({points.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOriginal(null);
                    setPoints([]);
                    reset();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e3e6] bg-white px-3 py-1.5 text-sm font-medium text-[#63676b] transition-colors hover:border-[#63676b] hover:text-[#1e1919]"
                >
                  <IconRefresh className="h-4 w-4" />
                  New image
                </button>
              </div>
            </div>

            <div
              onClick={handleCanvasClick}
              className="relative mx-auto overflow-hidden rounded-lg border border-[#e1e3e6] bg-[repeating-conic-gradient(#f0f2f4_0%_25%,white_0%_50%)] bg-[length:20px_20px]"
              style={{
                width: displaySize.width,
                height: displaySize.height,
                cursor: mode === "points" ? "crosshair" : "default",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={original.dataUrl}
                alt="Source upload"
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
              {mode === "points" &&
                points.map((p, i) => (
                  <span
                    key={i}
                    className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                      p.label === 1 ? "bg-[#0061fe]" : "bg-red-500"
                    }`}
                    style={{
                      left: (p.x / original.width) * displaySize.width,
                      top: (p.y / original.height) * displaySize.height,
                    }}
                  />
                ))}
            </div>

            <div className="mt-4">
              <RightsCheckbox />
            </div>

            <div className="mt-4 flex items-center gap-3">
              {mode === "auto" ? (
                <button
                  type="button"
                  onClick={handleAutoDecompose}
                  disabled={status === "running" || !acknowledged}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0061fe] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "running" && <Spinner />}
                  Auto-Decompose Layers
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSegmentSelection}
                  disabled={status === "running" || !acknowledged || points.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0061fe] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "running" && <Spinner />}
                  Segment Selection
                </button>
              )}
              <p className="text-xs text-[#63676b]">
                {mode === "points"
                  ? "Click to mark the element (shift-click to mark background to exclude)."
                  : "Runs background isolation + structural segmentation automatically."}
              </p>
            </div>

            {status === "running" && phase && (
              <div className="mt-4">
                <DynamicLoadingState phase={phase} progress={progress} />
              </div>
            )}

            {status === "error" && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <aside className="h-fit rounded-xl border border-[#e1e3e6] bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1e1919]">
              <IconLayers className="h-4 w-4 text-[#0061fe]" />
              Layers
            </h2>
            {layers.length === 0 ? (
              <p className="mt-2 text-sm text-[#63676b]">
                Run a decomposition to populate layers here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {layers.map((layer) => (
                  <li
                    key={layer.id}
                    className="flex items-center gap-3 rounded-md border border-[#e1e3e6] p-2 transition-colors hover:border-[#63676b]"
                  >
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={() => toggleLayer(layer.id)}
                        className="h-4 w-4 accent-[#0061fe]"
                      />
                    </label>
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-[#e1e3e6] bg-[repeating-conic-gradient(#f0f2f4_0%_25%,white_0%_50%)] bg-[length:8px_8px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={layer.imageUrl}
                        alt={layer.label}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="truncate text-sm text-[#1e1919]">
                      {layer.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 space-y-2 border-t border-[#e1e3e6] pt-4">
              <button
                type="button"
                onClick={() => handleExportClick("psd")}
                disabled={layers.length === 0 || exporting !== null || !isHydrated}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0061fe] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exporting === "psd" ? <Spinner /> : <IconDownload className="h-4 w-4" />}
                Export .psd
              </button>
              <button
                type="button"
                onClick={() => handleExportClick("pdf")}
                disabled={layers.length === 0 || exporting !== null || !isHydrated}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-[#e1e3e6] bg-white px-4 py-2 text-sm font-semibold text-[#1e1919] transition-colors hover:border-[#63676b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exporting === "pdf" ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#e1e3e6] border-t-[#0061fe]" />
                ) : (
                  <IconDownload className="h-4 w-4" />
                )}
                Export .pdf
              </button>
            </div>
          </aside>
        </div>
          )}
        </div>
      </div>

      <EmailCaptureModal
        isOpen={showEmailModal}
        onSubmit={handleEmailSubmit}
        onSkip={handleSkipEmail}
      />
    </div>
  );
}

function ModeToggle({
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
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-[#0061fe] text-white" : "text-[#63676b] hover:text-[#1e1919]"
      }`}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

