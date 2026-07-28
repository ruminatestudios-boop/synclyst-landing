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
          className: `group relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-8 overflow-hidden rounded-3xl px-8 py-20 text-center transition-all duration-300 ${
            isDragActive
              ? "bg-gradient-to-br from-[#0061fe] via-[#0061fe]/90 to-[#0050d0] shadow-2xl shadow-[#0061fe]/30 scale-[1.02]"
              : "bg-gradient-to-br from-[#0061fe]/5 via-[#0061fe]/[0.02] to-[#7db2ff]/5 border-2 border-[#0061fe]/20 hover:border-[#0061fe]/50 hover:shadow-xl hover:shadow-[#0061fe]/10"
          }`,
        })}
      >
        {/* Animated gradient overlay on drag */}
        {isDragActive && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#0050d0]/20 to-transparent animate-pulse pointer-events-none" />
        )}

        <input {...getInputProps()} />

        {/* Icon container with enhanced styling */}
        <div className={`relative transition-all duration-300 ${isDragActive ? "scale-125" : "scale-100 group-hover:scale-110"}`}>
          <div className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
            isDragActive
              ? "bg-white text-[#0061fe] shadow-2xl shadow-white/50"
              : "bg-gradient-to-br from-[#0061fe]/15 to-[#0061fe]/5 text-[#0061fe] group-hover:from-[#0061fe]/25 group-hover:to-[#0061fe]/15 group-hover:shadow-lg group-hover:shadow-[#0061fe]/15"
          }`}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="transition-transform duration-300 group-hover:scale-125">
              <path
                d="M24 34V14M24 14l-8 8M24 14l8 8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 32h24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Text content with enhanced typography */}
        <div className="relative space-y-3">
          <p className={`text-4xl font-black tracking-tight transition-colors duration-300 ${
            isDragActive ? "text-white" : "text-[#1e1919]"
          }`}>{label}</p>
          <p className={`text-lg transition-colors duration-300 ${
            isDragActive ? "text-white/90" : "text-[#63676b]"
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
