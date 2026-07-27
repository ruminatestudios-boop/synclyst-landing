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
          className: `group relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl px-8 py-16 text-center transition-all duration-300 ${
            isDragActive
              ? "bg-gradient-to-br from-[#0061fe]/10 to-[#0061fe]/5 shadow-lg scale-[1.02]"
              : "bg-gradient-to-br from-[#f7f9fa] to-white hover:shadow-lg border border-[#e1e3e6] hover:border-[#0061fe]"
          }`,
        })}
      >
        {/* Animated background gradient on drag */}
        {isDragActive && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0061fe]/5 via-transparent to-[#7db2ff]/5 animate-pulse pointer-events-none" />
        )}

        <input {...getInputProps()} />

        {/* Icon container */}
        <div className={`relative transition-all duration-300 ${isDragActive ? "scale-110" : "scale-100"}`}>
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300 ${
            isDragActive
              ? "bg-[#0061fe] text-white shadow-lg shadow-[#0061fe]/20"
              : "bg-gradient-to-br from-[#0061fe]/10 to-[#0061fe]/5 text-[#0061fe] group-hover:from-[#0061fe]/15 group-hover:to-[#0061fe]/10"
          }`}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="transition-transform duration-300 group-hover:scale-110">
              <path
                d="M24 34V14M24 14l-8 8M24 14l8 8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 32h24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Text content */}
        <div className="relative">
          <p className="text-2xl font-bold text-[#1e1919] tracking-tight">{label}</p>
          <p className="mt-2 text-base text-[#63676b] leading-relaxed">{hint}</p>
        </div>
      </div>
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
