"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const VideoEditor = dynamic(() => import("@/components/VideoEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400 backdrop-blur-xl">
      Loading editor…
    </div>
  ),
});

export default function VideoEditorShell() {
  return (
    <Suspense fallback={null}>
      <VideoEditor />
    </Suspense>
  );
}
