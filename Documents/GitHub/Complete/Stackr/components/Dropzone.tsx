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
          className: `group flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed px-8 py-16 text-center shadow-sm transition-colors ${
            isDragActive
              ? "border-[#0061fe] bg-[#0061fe]/5"
              : "border-[#e1e3e6] bg-white hover:border-[#0061fe] hover:bg-[#f7f9fa]"
          }`,
        })}
      >
        <input {...getInputProps()} />
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0061fe]/10 text-[#0061fe]">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <rect
              x="4"
              y="4"
              width="40"
              height="40"
              rx="8"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={isDragActive ? "6 6" : "0"}
            />
            <path
              d="M24 30V16M24 16l-6 6M24 16l6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-lg font-semibold text-[#1e1919]">{label}</p>
          <p className="mt-1 text-sm text-[#63676b]">{hint}</p>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
