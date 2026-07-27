"use client";

import { useEffect, useMemo, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { DynamicLoadingState } from "@/components/DynamicLoadingState";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
import { takePendingFile } from "@/lib/pending-upload";
import { useEmailCapture } from "@/lib/use-email-capture";
import {
  fileToImageData,
  dataUrlToImageData,
  downloadTextFile,
} from "@/lib/image-utils";
import {
  useVectorize,
  VECTORIZE_PRESETS,
  type VectorizePreset,
} from "@/lib/use-vectorize";
import { useEnhance, type EnhanceMode, type RecreateSubject } from "@/lib/use-enhance";
import { useUpscaler } from "@/lib/use-upscaler";
import { useUsageLimit } from "@/lib/use-usage-limit";
import type { UpscaleScale } from "@/lib/upscaler-client";
import { UpgradeModal } from "@/components/UpgradeModal";
import { usePro } from "@/lib/pro-context";
import { useRights } from "@/lib/rights-context";
import { RightsCheckbox } from "@/components/RightsCheckbox";
import { svgToSvg, svgToPng, svgToJpg, svgToPdf, svgToEps } from "@/lib/svg-export";
import {
  IconSparkles,
  IconDownload,
  IconRefresh,
  IconUndo,
  IconUpscale,
} from "@/components/icons";

const UPSCALE_FREE_LIMIT = 5;

type Source = {
  dataUrl: string;
  width: number;
  height: number;
  imageData: ImageData;
  name: string;
};

function suggestPreset(imageData: ImageData): VectorizePreset {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Sample every 4th pixel to speed up analysis
  const step = 4;
  const pixels = [];
  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a > 128) pixels.push({ r, g, b });
  }

  if (pixels.length === 0) return "vtracer";

  // Count unique colors
  const colorSet = new Set(pixels.map((p) => `${p.r},${p.g},${p.b}`));
  const uniqueColors = colorSet.size;

  // Detect edge sharpness using Sobel-like sampling
  let edgeCount = 0;
  let totalSamples = 0;
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = (y * width + x) * 4;
      const current = data[idx] + data[idx + 1] + data[idx + 2];
      const right = data[(y * width + (x + 1)) * 4] + data[(y * width + (x + 1)) * 4 + 1] + data[(y * width + (x + 1)) * 4 + 2];
      const down = data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2];
      if (Math.abs(current - right) > 60 || Math.abs(current - down) > 60) edgeCount++;
      totalSamples++;
    }
  }
  const edgeRatio = totalSamples > 0 ? edgeCount / totalSamples : 0;

  // Decision logic
  if (uniqueColors <= 4 && edgeRatio > 0.15) return "potrace"; // Logos: few colors + sharp edges
  if (uniqueColors <= 8) return "clean"; // Flat: simple color palette
  if (edgeRatio > 0.3) return "fine-detail"; // Detail: lots of edges = complexity
  return "vtracer"; // Balanced: default fallback
}

export default function VectorizerPage() {
  const { isPro, togglePro } = usePro();
  const { acknowledged } = useRights();
  const [original, setOriginal] = useState<Source | null>(null);
  const [preEnhance, setPreEnhance] = useState<Source | null>(null);
  const [appliedEnhance, setAppliedEnhance] = useState<EnhanceMode | null>(null);
  const [preUpscale, setPreUpscale] = useState<Source | null>(null);
  const [appliedUpscale, setAppliedUpscale] = useState<UpscaleScale | null>(null);
  const [upscaleScale, setUpscaleScale] = useState<UpscaleScale>(2);
  const [showUpscaleUpgrade, setShowUpscaleUpgrade] = useState(false);
  const [fidelity, setFidelity] = useState(0.7);
  const [subject, setSubject] = useState<RecreateSubject>("logo");
  const [preset, setPreset] = useState<VectorizePreset>("vtracer");
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [view, setView] = useState<"original" | "vector">("vector");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<"svg" | "png" | "jpg" | "pdf" | "eps" | null>(null);
  const { status, svg, error, vectorize, reset, phase } = useVectorize();
  const enhance = useEnhance();
  const upscaler = useUpscaler();
  const upscaleUsage = useUsageLimit("upscaler", UPSCALE_FREE_LIMIT);
  const { hasOptedIn, captureEmail, isHydrated } = useEmailCapture();

  const svgDataUrl = useMemo(() => {
    if (!svg) return null;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [svg]);

  async function handleFile(file: File) {
    reset();
    enhance.reset();
    upscaler.reset();
    setView("vector");
    setPreEnhance(null);
    setAppliedEnhance(null);
    setPreUpscale(null);
    setAppliedUpscale(null);
    const { imageData, width, height, dataUrl } = await fileToImageData(file);
    setOriginal({ imageData, width, height, dataUrl, name: file.name });
    const suggestedPreset = suggestPreset(imageData);
    setPreset(suggestedPreset);
    vectorize(imageData, suggestedPreset);
  }

  // Picks up a file dropped on the homepage hero's upload zone, if any.
  // Replays the same one-time action a real drop would trigger — not a
  // reactive subscription, so the usual cascading-render concern doesn't
  // apply here.
  useEffect(() => {
    const file = takePendingFile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (file) handleFile(file);
    // Only ever runs once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Don't close if clicking inside dropdowns
      const target = e.target as HTMLElement;
      if (target.closest('[data-dropdown]')) return;

      setShowPresetDropdown(false);
      setShowDownloadMenu(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  function handlePresetChange(next: VectorizePreset) {
    setPreset(next);
    if (original) vectorize(original.imageData, next);
  }

  async function handleDownloadClick(format: "svg" | "png" | "jpg" | "pdf" | "eps") {
    if (!isHydrated) return;

    if (!hasOptedIn) {
      setPendingFormat(format);
      setShowEmailModal(true);
    } else {
      await performDownload(format);
    }
  }

  async function handleEmailSubmit(email: string) {
    await captureEmail(email);
    if (pendingFormat) {
      await performDownload(pendingFormat);
    }
    setShowEmailModal(false);
    setPendingFormat(null);
    setShowDownloadMenu(false);
  }

  function handleSkipEmail() {
    setShowEmailModal(false);
    setPendingFormat(null);
  }

  async function performDownload(format: "svg" | "png" | "jpg" | "pdf" | "eps") {
    if (!svg || !original) return;
    const base = original.name.replace(/\.[^.]+$/, "");

    switch (format) {
      case "svg":
        svgToSvg(svg, `${base}.svg`);
        break;
      case "png":
        await svgToPng(svg, `${base}.png`);
        break;
      case "jpg":
        await svgToJpg(svg, `${base}.jpg`);
        break;
      case "pdf":
        await svgToPdf(svg, `${base}.pdf`);
        break;
      case "eps":
        await svgToEps(svg, `${base}.eps`);
        break;
    }
    setShowDownloadMenu(false);
  }

  function handleSubjectChange(next: RecreateSubject) {
    setSubject(next);
    setFidelity(next === "photo" ? 0.45 : 0.7);
  }

  async function handleEnhance(mode: EnhanceMode) {
    if (!original || !acknowledged) return;
    const resultDataUrl = await enhance.run(
      original.dataUrl,
      mode,
      mode === "recreate" ? fidelity : undefined,
      mode === "recreate" ? subject : undefined
    );
    if (!resultDataUrl) return;

    const decoded = await dataUrlToImageData(resultDataUrl);
    setPreEnhance(original);
    setAppliedEnhance(mode);
    const next = { ...decoded, name: original.name };
    setOriginal(next);
    vectorize(decoded.imageData, preset);
  }

  function handleRevertEnhance() {
    if (!preEnhance) return;
    setOriginal(preEnhance);
    setPreEnhance(null);
    setAppliedEnhance(null);
    enhance.reset();
    vectorize(preEnhance.imageData, preset);
  }

  async function handleUpscale() {
    if (!original) return;
    // DEVELOPMENT MODE: Limit check disabled for testing. Uncomment to re-enable 5-limit.
    // if (upscaleUsage.limitReached) {
    //   setShowUpscaleUpgrade(true);
    //   return;
    // }
    const resultDataUrl = await upscaler.run(original.dataUrl, upscaleScale);
    if (!resultDataUrl) return;

    const decoded = await dataUrlToImageData(resultDataUrl);
    // upscaleUsage.increment();
    setPreUpscale(original);
    setAppliedUpscale(upscaleScale);
    const next = { ...decoded, name: original.name };
    setOriginal(next);
    vectorize(decoded.imageData, preset);
  }

  function handleRevertUpscale() {
    if (!preUpscale) return;
    setOriginal(preUpscale);
    setPreUpscale(null);
    setAppliedUpscale(null);
    upscaler.reset();
    vectorize(preUpscale.imageData, preset);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <span className="inline-block text-sm font-bold uppercase tracking-widest text-[#0061fe] mb-6">
            Free Tool
          </span>
          <h1 className="text-6xl md:text-7xl font-black text-[#1e1919] leading-tight mb-8">
            Image Vectorizer
          </h1>
          <p className="text-xl md:text-2xl text-[#63676b] max-w-3xl mx-auto leading-relaxed">
            Convert raster images to clean SVG vectors. Everything runs locally in your browser via a web worker — nothing is uploaded anywhere.
          </p>
        </div>

        <div className="mt-24">
              {!original && (
            <>
              <Dropzone onFile={handleFile} label="Drop a raster image to vectorize" />
            </>
          )}

          {original && (
            <div className="rounded-xl border border-[#e1e3e6] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 rounded-lg border border-[#e1e3e6] bg-[#f7f9fa] p-1">
              <ViewToggle
                active={view === "original"}
                onClick={() => setView("original")}
              >
                Original
              </ViewToggle>
              <ViewToggle
                active={view === "vector"}
                onClick={() => setView("vector")}
              >
                Vector
              </ViewToggle>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#63676b]">Preset</span>
                <div className="relative" data-dropdown>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPresetDropdown(!showPresetDropdown);
                    }}
                    className="rounded-md border border-[#0061fe]/20 bg-[#0061fe]/5 px-3 py-1.5 text-sm font-medium text-[#0061fe] hover:border-[#0061fe]/40 flex items-center gap-2 min-w-[200px] justify-between"
                  >
                    {VECTORIZE_PRESETS[preset].label}
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                  {showPresetDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#0061fe]/20 rounded-md shadow-lg z-50" data-dropdown>
                      {Object.entries(VECTORIZE_PRESETS).map(([key, p]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            handlePresetChange(key as VectorizePreset);
                            setShowPresetDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            preset === key
                              ? "bg-[#0061fe] text-white font-medium"
                              : "text-[#1e1919] hover:bg-[#0061fe]/10"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOriginal(null);
                    setPreEnhance(null);
                    setAppliedEnhance(null);
                    setPreUpscale(null);
                    setAppliedUpscale(null);
                    reset();
                    enhance.reset();
                    upscaler.reset();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e3e6] bg-white px-3 py-1.5 text-sm font-medium text-[#63676b] transition-colors hover:border-[#63676b] hover:text-[#1e1919]"
                >
                  <IconRefresh className="h-4 w-4" />
                  New image
                </button>

                <div className="relative" data-dropdown>
                  <button
                    type="button"
                    disabled={status !== "done"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDownloadMenu(!showDownloadMenu);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0061fe] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconDownload className="h-4 w-4" />
                    Download
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-[#e1e3e6] rounded-md shadow-lg z-50 min-w-[150px]" data-dropdown>
                      <button
                        type="button"
                        onClick={() => handleDownloadClick("svg")}
                        className="w-full text-left px-4 py-2 text-sm text-[#1e1919] hover:bg-[#f7f9fa] border-b border-[#e1e3e6] last:border-b-0"
                      >
                        SVG (Vector)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadClick("png")}
                        className="w-full text-left px-4 py-2 text-sm text-[#1e1919] hover:bg-[#f7f9fa] border-b border-[#e1e3e6] last:border-b-0"
                      >
                        PNG (Transparent)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadClick("jpg")}
                        className="w-full text-left px-4 py-2 text-sm text-[#1e1919] hover:bg-[#f7f9fa] border-b border-[#e1e3e6] last:border-b-0"
                      >
                        JPG (Compressed)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadClick("pdf")}
                        className="w-full text-left px-4 py-2 text-sm text-[#1e1919] hover:bg-[#f7f9fa] border-b border-[#e1e3e6] last:border-b-0"
                      >
                        PDF (Print)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadClick("eps")}
                        className="w-full text-left px-4 py-2 text-sm text-[#1e1919] hover:bg-[#f7f9fa] border-b border-[#e1e3e6] last:border-b-0"
                      >
                        EPS (PostScript)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <UpscalePanel
            upscaler={upscaler}
            scale={upscaleScale}
            onScaleChange={setUpscaleScale}
            appliedUpscale={appliedUpscale}
            canRevert={!!preUpscale}
            onRevert={handleRevertUpscale}
            onRun={handleUpscale}
            remaining={upscaleUsage.remaining}
            limit={UPSCALE_FREE_LIMIT}
          />

          {isPro && (
            <EnhancePanel
              isPro={isPro}
              onEnablePro={togglePro}
              acknowledged={acknowledged}
              enhance={enhance}
              appliedEnhance={appliedEnhance}
              canRevert={!!preEnhance}
              onRevert={handleRevertEnhance}
              onRun={handleEnhance}
              fidelity={fidelity}
              onFidelityChange={setFidelity}
              subject={subject}
              onSubjectChange={handleSubjectChange}
            />
          )}

          <div
            className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-[#e1e3e6] bg-[repeating-conic-gradient(#f0f2f4_0%_25%,white_0%_50%)] bg-[length:20px_20px]"
            style={{ minHeight: 420 }}
          >
            <div className="flex-1 flex items-center justify-center w-full">
              {view === "original" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={original.dataUrl}
                  alt="Original upload"
                  className="max-h-[520px] max-w-full object-contain"
                />
              )}
              {view === "vector" && status === "done" && svgDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={svgDataUrl}
                  alt="Vectorized result"
                  className="max-h-[520px] max-w-full object-contain"
                />
              )}
              {view === "vector" && status === "processing" && phase && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <DynamicLoadingState phase={phase} progress={50} showProgress={false} />
                </div>
              )}
              {view === "vector" && status === "error" && (
                <p className="p-8 text-sm text-red-600">{error}</p>
              )}
            </div>
            {status === "done" && (
              <div className="border-t border-[#e1e3e6] bg-white/80 w-full py-2 text-center">
                <p className="text-xs text-[#63676b]">
                  {original.width}×{original.height}px → SVG
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-xs text-[#63676b]">
            {original.width}×{original.height}px source
            {appliedUpscale ? ` · upscaled (${appliedUpscale}x)` : ""}
            {appliedEnhance ? ` · enhanced (${appliedEnhance})` : ""}
            {status === "done" && svg
              ? ` · ${(svg.length / 1024).toFixed(1)} KB SVG`
              : ""}
          </p>

          {isPro && (
            <div className="mt-4">
              <RightsCheckbox />
            </div>
          )}
        </div>
      )}

        {showUpscaleUpgrade && (
          <UpgradeModal
            title="You've used all 5 free upscales"
            description="Enable Pro (demo) to keep upscaling before you vectorize — no billing is wired up yet, this just previews the upgrade flow."
            onClose={() => setShowUpscaleUpgrade(false)}
            onUpgrade={() => {
              togglePro();
              setShowUpscaleUpgrade(false);
            }}
          />
        )}

        <EmailCaptureModal
          isOpen={showEmailModal}
          onSubmit={handleEmailSubmit}
          onSkip={handleSkipEmail}
        />
        </div>
      </div>
    </div>
  );
}

function UpscalePanel({
  upscaler,
  scale,
  onScaleChange,
  appliedUpscale,
  canRevert,
  onRevert,
  onRun,
  remaining,
  limit,
}: {
  upscaler: ReturnType<typeof useUpscaler>;
  scale: UpscaleScale;
  onScaleChange: (v: UpscaleScale) => void;
  appliedUpscale: UpscaleScale | null;
  canRevert: boolean;
  onRevert: () => void;
  onRun: () => void;
  remaining: number;
  limit: number;
}) {
  const running = upscaler.status === "running";
  const { phase, progress } = upscaler;

  return (
    <div className="mb-4 rounded-lg border border-[#e1e3e6] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0061fe]/10 text-[#0061fe]">
            <IconUpscale className="h-5 w-5" />
          </span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#0061fe]">
              Upscale first · Free
            </span>
            <p className="mt-0.5 text-sm text-[#63676b]">
              Weak, low-res source? Reconstruct detail with local AI before
              tracing — often the biggest single quality jump.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-[#e1e3e6] bg-[#f7f9fa] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onScaleChange(2)}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                scale === 2
                  ? "bg-white text-[#1e1919] shadow-sm"
                  : "text-[#63676b] hover:text-[#1e1919]"
              }`}
            >
              2x
            </button>
            <button
              type="button"
              onClick={() => onScaleChange(4)}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                scale === 4
                  ? "bg-white text-[#1e1919] shadow-sm"
                  : "text-[#63676b] hover:text-[#1e1919]"
              }`}
            >
              4x
            </button>
          </div>
          <button
            type="button"
            disabled={running}
            onClick={onRun}
            className="inline-flex items-center gap-2 rounded-md bg-[#0061fe] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running && <Spinner />}
            Upscale &amp; retrace
          </button>
        </div>
      </div>

      {running && phase && (
        <div className="mt-3">
          <DynamicLoadingState phase={phase} progress={progress} />
        </div>
      )}

      {(canRevert || appliedUpscale || upscaler.status === "error") && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {appliedUpscale && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0061fe]/10 px-2.5 py-1 text-xs font-semibold text-[#0061fe]">
              Upscaled ({appliedUpscale}x)
            </span>
          )}
          {canRevert && (
            <button
              type="button"
              onClick={onRevert}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[#63676b] hover:text-[#1e1919]"
            >
              <IconUndo className="h-4 w-4" />
              Revert to original upload
            </button>
          )}
          {upscaler.status === "error" && (
            <p className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {upscaler.error}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-[#63676b]">
        {remaining} of {limit} free upscales left this session.
      </p>
    </div>
  );
}

function EnhancePanel({
  isPro,
  onEnablePro,
  acknowledged,
  enhance,
  appliedEnhance,
  canRevert,
  onRevert,
  onRun,
  fidelity,
  onFidelityChange,
  subject,
  onSubjectChange,
}: {
  isPro: boolean;
  onEnablePro: () => void;
  acknowledged: boolean;
  enhance: ReturnType<typeof useEnhance>;
  appliedEnhance: EnhanceMode | null;
  canRevert: boolean;
  onRevert: () => void;
  onRun: (mode: EnhanceMode) => void;
  fidelity: number;
  onFidelityChange: (v: number) => void;
  subject: RecreateSubject;
  onSubjectChange: (v: RecreateSubject) => void;
}) {
  const running = enhance.status === "running";
  const disabled = running || !acknowledged;
  const { phase } = enhance;

  return (
    <div className="mb-4 rounded-lg border border-[#0061fe]/20 bg-gradient-to-br from-[#0061fe]/[0.04] to-transparent p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0061fe]/10 text-[#0061fe]">
            <IconSparkles className="h-5 w-5" />
          </span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#0061fe]">
              Enhance with AI · Pro
            </span>
            <p className="mt-0.5 text-sm text-[#63676b]">
              {isPro
                ? "Cleans the source image before tracing, for a crisper result than the raw upload alone."
                : "Flip the demo Pro toggle to try AI-powered enhancement before tracing."}
            </p>
          </div>
        </div>
        {!isPro && (
          <button
            type="button"
            onClick={onEnablePro}
            className="shrink-0 rounded-md bg-[#0061fe] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0050d0]"
          >
            Enable Pro (demo)
          </button>
        )}
      </div>

      {isPro && running && phase && (
        <div className="mt-4 border-t border-[#0061fe]/10 pt-4">
          <DynamicLoadingState phase={phase} progress={50} showProgress={false} />
        </div>
      )}

      {isPro && (
        <div className="mt-4 grid gap-4 border-t border-[#0061fe]/10 pt-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-[#e1e3e6] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#1e1919]">Restore</h3>
            <p className="mt-1 flex-1 text-xs text-[#63676b]">
              Denoise + sharpen. Stays true to the original design.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRun("restore")}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-[#e1e3e6] bg-[#f7f9fa] px-3 py-2 text-sm font-semibold text-[#1e1919] transition-colors hover:border-[#63676b] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running && enhance.mode === "restore" && <Spinner />}
              Restore image
            </button>
          </div>

          <div className="flex flex-col rounded-lg border border-[#e1e3e6] bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1e1919]">Recreate</h3>
              <span className="rounded-full bg-[#0061fe]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0061fe]">
                AI redraw
              </span>
            </div>
            <p className="mt-1 text-xs text-[#63676b]">
              {subject === "photo"
                ? "Flattens a photo into vector-ready shapes before tracing — photos need lower fidelity to flatten well."
                : "Can look sharper than the original, but is a reinterpretation — review small text/details before using."}
            </p>

            <div className="mt-3 flex items-center gap-1 rounded-md border border-[#e1e3e6] bg-[#f7f9fa] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onSubjectChange("logo")}
                className={`flex-1 rounded px-2 py-1 font-medium transition-colors ${
                  subject === "logo"
                    ? "bg-white text-[#1e1919] shadow-sm"
                    : "text-[#63676b] hover:text-[#1e1919]"
                }`}
              >
                Logo / graphic
              </button>
              <button
                type="button"
                onClick={() => onSubjectChange("photo")}
                className={`flex-1 rounded px-2 py-1 font-medium transition-colors ${
                  subject === "photo"
                    ? "bg-white text-[#1e1919] shadow-sm"
                    : "text-[#63676b] hover:text-[#1e1919]"
                }`}
              >
                Photo
              </button>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-[#63676b]">
              Fidelity
              <input
                type="range"
                min={0.15}
                max={0.9}
                step={0.05}
                value={fidelity}
                onChange={(e) => onFidelityChange(Number(e.target.value))}
                className="flex-1 accent-[#0061fe]"
              />
              <span className="w-9 shrink-0 text-right font-semibold text-[#1e1919]">
                {Math.round(fidelity * 100)}%
              </span>
            </label>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onRun("recreate")}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-[#e1e3e6] bg-[#f7f9fa] px-3 py-2 text-sm font-semibold text-[#1e1919] transition-colors hover:border-[#63676b] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running && enhance.mode === "recreate" && <Spinner />}
              Recreate image
            </button>
          </div>
        </div>
      )}

      {(canRevert || appliedEnhance || enhance.status === "error") && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {appliedEnhance && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0061fe]/10 px-2.5 py-1 text-xs font-semibold text-[#0061fe]">
              Enhanced ({appliedEnhance})
            </span>
          )}
          {canRevert && (
            <button
              type="button"
              onClick={onRevert}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[#63676b] hover:text-[#1e1919]"
            >
              <IconUndo className="h-4 w-4" />
              Revert to original upload
            </button>
          )}
          {enhance.status === "error" && (
            <p className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {enhance.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#e1e3e6] border-t-[#0061fe]" />
  );
}

function ViewToggle({
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

