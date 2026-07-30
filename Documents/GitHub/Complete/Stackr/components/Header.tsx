"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePro } from "@/lib/pro-context";

export function Header() {
  const { isPro, togglePro } = usePro();
  const searchParams = useSearchParams();

  if (searchParams.get("embed") === "1") {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#e1e3e6] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0061fe] text-sm font-bold text-white">
            S
          </span>
          <span className="text-[15px] font-semibold text-[#1e1919]">
            Stackr
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#63676b] sm:flex">
          <Link href="/tools/upscaler" className="flex items-center gap-2 hover:text-[#1e1919]">
            Upscaler
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">LIMITED FREE</span>
          </Link>
          <Link href="/tools/vectorizer" className="flex items-center gap-2 hover:text-[#1e1919]">
            Vectorizer
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">FREE</span>
          </Link>
          <Link href="/tools/background-remover" className="flex items-center gap-2 hover:text-[#1e1919]">
            Background Remover
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">FREE</span>
          </Link>
          <Link href="/tools/layer-studio" className="flex items-center gap-2 hover:text-[#1e1919]">
            Layer Studio
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">PRO</span>
          </Link>
          <Link href="/tools/before-after" className="flex items-center gap-2 hover:text-[#1e1919]">
            Before &amp; After
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">FREE</span>
          </Link>
          <Link href="/tools/batch" className="flex items-center gap-2 hover:text-[#1e1919]">
            Batch
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">FREE</span>
          </Link>
          <Link href="/about" className="hover:text-[#1e1919]">
            About
          </Link>
        </nav>

        <button
          type="button"
          onClick={togglePro}
          title="Demo-only toggle. Simulates a Pro subscription; no billing is wired up."
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            isPro
              ? "border-[#0061fe] bg-[#0061fe]/10 text-[#0061fe]"
              : "border-[#e1e3e6] bg-white text-[#63676b] hover:border-[#63676b]"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isPro ? "bg-[#0061fe]" : "bg-[#c4c7ca]"
            }`}
          />
          {isPro ? "Pro (demo)" : "Free plan"}
        </button>
      </div>
    </header>
  );
}
