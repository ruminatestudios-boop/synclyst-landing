"use client";

import { useState, useRef, useEffect } from "react";
import type { Layer } from "@/lib/layer-compose";

interface LayerEditorProps {
  layer: Layer;
  width: number;
  height: number;
  onUpdate: (updatedImageUrl: string) => void;
}

export function LayerEditor({ layer, width, height, onUpdate }: LayerEditorProps) {
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [mode, setMode] = useState<"view" | "paint" | "erase">("view");
  const [brushSize, setBrushSize] = useState(20);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = layer.imageUrl;
  }, [layer, width, height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === "view") return;
    isDrawing.current = true;
    handleDraw(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current || mode === "view") return;
    handleDraw(e);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleDraw = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const canvasX = (e.clientX - containerRect.left - (containerRect.width - (width * zoom) / 100) / 2 + panX) / (zoom / 100);
    const canvasY = (e.clientY - containerRect.top - (containerRect.height - (height * zoom) / 100) / 2 + panY) / (zoom / 100);

    if (mode === "paint") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (mode === "erase") {
      ctx.clearRect(canvasX - brushSize / 2, canvasY - brushSize / 2, brushSize, brushSize);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onUpdate(dataUrl);
  };

  const zoomLevel = zoom / 100;

  return (
    <div className="rounded-lg border border-[#e1e3e6] bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="rounded px-2 py-1 text-sm font-medium text-[#63676b] hover:bg-[#f7f9fa]"
          >
            −
          </button>
          <span className="w-16 text-center text-sm font-medium text-[#63676b]">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="rounded px-2 py-1 text-sm font-medium text-[#63676b] hover:bg-[#f7f9fa]"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[#e1e3e6] bg-[#f7f9fa] p-1">
          <button
            onClick={() => setMode("view")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "view" ? "bg-white text-[#1e1919] shadow-sm" : "text-[#63676b] hover:text-[#1e1919]"
            }`}
          >
            View
          </button>
          <button
            onClick={() => setMode("paint")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "paint" ? "bg-white text-[#1e1919] shadow-sm" : "text-[#63676b] hover:text-[#1e1919]"
            }`}
          >
            Paint
          </button>
          <button
            onClick={() => setMode("erase")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "erase" ? "bg-white text-[#1e1919] shadow-sm" : "text-[#63676b] hover:text-[#1e1919]"
            }`}
          >
            Erase
          </button>
        </div>

        {mode !== "view" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#63676b]">Brush:</label>
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs text-[#63676b]">{brushSize}px</span>
          </div>
        )}

        {mode !== "view" && (
          <button
            onClick={handleSave}
            className="ml-auto rounded-md bg-[#0061fe] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0050d0]"
          >
            Save Changes
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-[#e1e3e6] bg-[repeating-conic-gradient(#f0f2f4_0%_25%,white_0%_50%)] bg-[length:20px_20px]"
        style={{ height: "400px" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            overflow: "hidden",
            cursor: mode === "view" ? "default" : mode === "paint" ? "crosshair" : "grab",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center",
              cursor: mode === "view" ? "default" : mode === "paint" ? "crosshair" : "grab",
            }}
          />
        </div>
      </div>
    </div>
  );
}
