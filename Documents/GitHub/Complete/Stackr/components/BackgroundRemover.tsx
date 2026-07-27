"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Dropzone } from "@/components/Dropzone";
import { SwipeCompare } from "@/components/SwipeCompare";
import { DynamicLoadingState } from "@/components/DynamicLoadingState";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
import { useBackgroundRemoval } from "@/lib/use-background-removal";
import { useEmailCapture } from "@/lib/use-email-capture";
import { downloadBlob } from "@/lib/image-utils";
import { IconDownload, IconRefresh, IconSparkles } from "@/components/icons";

type Source = { url: string; name: string };

export function BackgroundRemover() {
  const [original, setOriginal] = useState<Source | null>(null);
  const [view, setView] = useState<"before" | "after" | "edit" | "compare">("after");
  const [selectionMode, setSelectionMode] = useState<"add" | "remove">("add");
  const [threshold, setThreshold] = useState(30);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ type: "highres" | "lowres" } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, progressPercent, resultUrl, error, run, reset, phase } =
    useBackgroundRemoval();
  const { hasOptedIn, captureEmail, isHydrated } = useEmailCapture();

  const isBusy = status === "loading-model" || status === "processing";

  function handleFile(file: File) {
    reset();
    setOriginal({ url: URL.createObjectURL(file), name: file.name });
    setView("after");
    run(file);
  }

  useEffect(() => {
    if (view !== "edit" || !resultUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = resultUrl;
  }, [view, resultUrl]);


  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    floodFill(ctx, x, y, canvas.width, canvas.height);
  }

  function floodFill(ctx: CanvasRenderingContext2D, startX: number, startY: number, width: number, height: number) {
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const startPixelIdx = (startY * width + startX) * 4;
    const startR = data[startPixelIdx];
    const startG = data[startPixelIdx + 1];
    const startB = data[startPixelIdx + 2];
    const startA = data[startPixelIdx + 3];

    const visited = new Uint8Array(width * height);
    const queue = [[startX, startY]];
    let head = 0;

    while (head < queue.length) {
      const [px, py] = queue[head++];
      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      const idx = py * width + px;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pixelIdx = idx * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];
      const a = data[pixelIdx + 3];

      const colorDist = Math.sqrt(
        (r - startR) * (r - startR) +
        (g - startG) * (g - startG) +
        (b - startB) * (b - startB)
      );

      if (colorDist <= threshold * 2.55) {
        if (selectionMode === "add") {
          data[pixelIdx + 3] = 255;
        } else {
          data[pixelIdx + 3] = 0;
        }

        queue.push([px + 1, py]);
        queue.push([px - 1, py]);
        queue.push([px, py + 1]);
        queue.push([px, py - 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function handleDownloadClick() {
    if (!isHydrated) return;

    if (!hasOptedIn) {
      setPendingDownload({ type: "highres" });
      setShowEmailModal(true);
    } else {
      performDownload("highres");
    }
  }

  function handleSkipDownload() {
    performDownload("lowres");
    setShowEmailModal(false);
  }

  async function handleEmailSubmit(email: string) {
    await captureEmail(email);
    performDownload("highres");
    setShowEmailModal(false);
    setPendingDownload(null);
  }

  async function performDownload(quality: "highres" | "lowres") {
    if (!resultUrl || !original) return;

    if (view === "edit" && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const base = original.name.replace(/\.[^.]+$/, "");
          downloadBlob(`${base}-no-bg.png`, blob);
        }
      }, "image/png");
    } else {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const base = original.name.replace(/\.[^.]+$/, "");
      downloadBlob(`${base}-no-bg.png`, blob);
    }
  }

  if (!original) {
    return <Dropzone onFile={handleFile} label="Drop a photo to remove its background" />;
  }

  return (
    <div className="rounded-xl border border-[#e1e3e6] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-[#e1e3e6] bg-[#f7f9fa] p-1">
          <ViewToggle active={view === "before"} onClick={() => setView("before")}>
            Before
          </ViewToggle>
          <ViewToggle active={view === "after"} onClick={() => setView("after")}>
            After
          </ViewToggle>
          <ViewToggle active={view === "compare"} onClick={() => setView("compare")}>
            Compare
          </ViewToggle>
          <ViewToggle active={view === "edit"} onClick={() => setView("edit")}>
            Refine
          </ViewToggle>
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setOriginal(null);
            reset();
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e3e6] bg-white px-3 py-1.5 text-sm font-medium text-[#63676b] transition-colors hover:border-[#63676b] hover:text-[#1e1919] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconRefresh className="h-4 w-4" />
          New image
        </button>
      </div>

      {isBusy && phase && <DynamicLoadingState phase={phase} progress={progressPercent} />}
      {isBusy && !phase && (
        <div className="mb-4 rounded-md border border-[#e1e3e6] bg-[#f7f9fa] p-3">
          <div className="flex items-center gap-2 text-xs text-[#63676b]">
            <span className="h-3 w-3 animate-pulse rounded-full bg-[#0061fe]" />
            <span>Processing…</span>
          </div>
        </div>
      )}

      {status === "error" && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error} — your device or browser may not support the required
          WebAssembly/WebGPU features.
        </p>
      )}

      {view === "edit" && resultUrl && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-[#e1e3e6] bg-[#f7f9fa] p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectionMode("add")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectionMode === "add"
                  ? "bg-[#0061fe] text-white"
                  : "border border-[#e1e3e6] text-[#63676b] hover:text-[#1e1919]"
              }`}
            >
              ✏️ Restore
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode("remove")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectionMode === "remove"
                  ? "bg-[#0061fe] text-white"
                  : "border border-[#e1e3e6] text-[#63676b] hover:text-[#1e1919]"
              }`}
            >
              🗑️ Remove
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#63676b]">Similarity:</label>
            <input
              type="range"
              min="5"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-xs text-[#63676b]">{threshold}</span>
          </div>

          <p className="w-full text-xs text-[#63676b]">💡 Click colors to select similar areas (higher = more colors selected)</p>
        </div>
      )}

      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-[#e1e3e6] bg-[repeating-conic-gradient(#f0f2f4_0%_25%,white_0%_50%)] bg-[length:20px_20px] ${
          isBusy ? "pointer-events-none opacity-60" : ""
        }`}
        style={{ minHeight: 320 }}
      >
        {view === "before" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={original.url} alt="Original" className="max-h-[440px] max-w-full object-contain" />
        ) : view === "compare" && resultUrl ? (
          <SwipeCompare
            beforeSrc={original.url}
            beforeAlt="Original"
            afterSrc={resultUrl}
            afterAlt="Background removed"
            maxHeight="440px"
          />
        ) : view === "edit" && resultUrl ? (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="max-h-[440px] max-w-full cursor-pointer"
            style={{ display: "block", maxHeight: "440px" }}
          />
        ) : resultUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resultUrl} alt="Background removed" className="max-h-[440px] max-w-full object-contain" />
        ) : (
          <p className="p-6 text-center text-xs text-[#63676b]">
            {isBusy ? "Processing…" : "Something went wrong producing a result."}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!resultUrl || !isHydrated}
          onClick={handleDownloadClick}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0061fe] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0050d0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconDownload className="h-4 w-4" />
          Download Clean PNG
        </button>
        <Link
          href="/tools/layer-studio"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#0061fe]/30 bg-[#0061fe]/[0.06] px-5 py-2.5 text-sm font-semibold text-[#0061fe] transition-colors hover:bg-[#0061fe]/10"
        >
          <IconSparkles className="h-4 w-4" />
          Auto-Split Layers with AI (Pro)
        </Link>
      </div>

      <EmailCaptureModal
        isOpen={showEmailModal}
        onSubmit={handleEmailSubmit}
        onSkip={handleSkipDownload}
      />
    </div>
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
