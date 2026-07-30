"use client";

import { useCallback, useState } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";

type DropzoneProps = {
  onFile: (file: File) => void;
  accept?: Accept;
  label?: string;
  hint?: string;
};

export function Dropzone({
  onFile,
  accept = { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"] },
  label = "Drop an image here",
  hint = "or click to browse — PNG, JPG, WEBP",
}: DropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        setError(rejected[0].errors[0]?.message ?? "File type not supported.");
        return;
      }
      setError(null);
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    maxSize: 25 * 1024 * 1024,
  });

  return (
    <div>
      <div
        {...getRootProps({
          className: `group relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl px-8 py-20 text-center transition-all duration-300 ${
            isDragActive ? "bg-[#0061fe]/5" : "hover:bg-[#f9fafb]"
          }`,
        })}
      >
        <input {...getInputProps()} />

        {/* Animated dashed border (handles rounded corners cleanly, unlike a CSS border) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <rect
            x="2"
            y="2"
            width="calc(100% - 4px)"
            height="calc(100% - 4px)"
            rx="14"
            ry="14"
            fill="none"
            stroke="#0061fe"
            strokeWidth={isDragActive ? 2 : 1.5}
            strokeDasharray="4 3"
            className="dropzone-dash-border"
          />
        </svg>

        {/* Icon */}
        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-xl bg-[#0061fe] transition-all duration-300 ${
            isDragActive ? "scale-110" : "upload-icon-bounce"
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15V3M12 3L7 8M12 3L17 8M5 21H19"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Text content */}
        <div className="relative space-y-2">
          <p className={`text-lg font-semibold transition-colors duration-300 ${
            isDragActive ? "text-[#0061fe]" : "text-[#1e1919]"
          }`}>{label}</p>
          <p className={`text-sm transition-colors duration-300 ${
            isDragActive ? "text-[#0061fe]" : "text-[#63676b]"
          }`}>{hint}</p>
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
