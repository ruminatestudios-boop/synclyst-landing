"use client";

import { useRef, useState } from "react";

interface SwipeCompareProps {
  beforeSrc: string;
  beforeAlt: string;
  afterSrc: string;
  afterAlt: string;
  maxHeight?: string;
}

export function SwipeCompare({
  beforeSrc,
  beforeAlt,
  afterSrc,
  afterAlt,
  maxHeight = "440px",
}: SwipeCompareProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  function setFromClientX(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-lg border border-[#e1e3e6] bg-gray-100"
      style={{ height: maxHeight, maxHeight }}
      onMouseDown={(e) => {
        isDragging.current = true;
        setFromClientX(e.clientX);
      }}
      onMouseMove={(e) => {
        if (isDragging.current) setFromClientX(e.clientX);
      }}
      onMouseUp={() => {
        isDragging.current = false;
      }}
      onMouseLeave={() => {
        isDragging.current = false;
      }}
      onTouchStart={(e) => {
        isDragging.current = true;
        setFromClientX(e.touches[0].clientX);
      }}
      onTouchMove={(e) => {
        if (isDragging.current) setFromClientX(e.touches[0].clientX);
      }}
      onTouchEnd={() => {
        isDragging.current = false;
      }}
    >
      {/* Before image — fills the container edge to edge */}
      <img
        src={beforeSrc}
        alt={beforeAlt}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* After image — same size/position as Before, revealed via clip-path so it never rescales */}
      <img
        src={afterSrc}
        alt={afterAlt}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      {/* Slider Handle */}
      <div
        className="absolute top-0 h-full w-1 cursor-col-resize bg-white shadow-lg"
        style={{ left: `${position}%` }}
      >
        <div className="absolute left-1/2 top-1/2 -ml-4 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
          <svg className="h-4 w-4 text-[#1e1919]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l7-7-7-7" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 rounded bg-black bg-opacity-50 px-2 py-1 text-xs font-medium text-white">
        Before
      </div>
      <div className="absolute top-3 right-3 rounded bg-black bg-opacity-50 px-2 py-1 text-xs font-medium text-white">
        After
      </div>
    </div>
  );
}
