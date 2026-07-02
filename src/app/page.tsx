import VideoEditorShell from "@/components/VideoEditorShell";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030014] text-zinc-50 relative overflow-hidden flex flex-col selection:bg-indigo-500/30">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-fuchsia-600/20 blur-[100px]" />
      </div>

      <header className="w-full pt-12 pb-8 px-4 sm:px-8 relative z-10 animate-in fade-in slide-in-from-top-8 duration-700">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300 backdrop-blur-sm mb-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
            100% Secure & Private
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-400">
            Video Clip Cutter
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-lg md:text-xl font-light">
            Trim and download video clips instantly in your browser. No server uploads, purely client-side.
          </p>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-8 pb-20 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        <VideoEditorShell />
      </main>
    </div>
  );
}
