import VideoEditor from "@/components/VideoEditor";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-950 dark:text-zinc-50 p-4 sm:p-8">
      <header className="max-w-5xl mx-auto mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video Clip Cutter</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Trim and download video clips quickly and securely in your browser.</p>
        </div>
      </header>

      <main>
        <VideoEditor />
      </main>
    </div>
  );
}
