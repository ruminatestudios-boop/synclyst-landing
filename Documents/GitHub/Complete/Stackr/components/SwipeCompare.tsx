"use client";

import { useState, useRef } from "react";

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

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setPosition(newPosition);
  };

  const handleTouchStart = () => {
    isDragging.current = true;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
    setPosition(newPosition);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-[#e1e3e6] bg-gray-100"
      style={{ height: maxHeight, maxHeight }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Before Image */}
      <img
        src={beforeSrc}
        alt={beforeAlt}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {/* After Image - Clipped */}
      <div
        className="absolute top-0 left-0 bottom-0 h-full overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={afterSrc}
          alt={afterAlt}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 h-full w-1 bg-white shadow-lg cursor-col-resize"
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Slider Icon */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
          <svg
            className="h-4 w-4 text-[#1e1919]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19l7-7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs font-medium">
        Before
      </div>
      <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs font-medium">
        After
      </div>
    </div>
  );
}
