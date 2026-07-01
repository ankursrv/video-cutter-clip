import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";

function nodeToWebStream(nodeStream: import("stream").Readable) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      if (typeof nodeStream.destroy === 'function') {
        nodeStream.destroy();
      }
    },
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const ytDlpPath = join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp.exe");

  try {
    // We must fetch the file size first to send Content-Length for the progress bar
    const infoProcess = spawn(ytDlpPath, [
      url,
      "-f", "b",
      "--dump-json",
      "--no-warnings",
      "--no-call-home",
      "--no-check-certificate"
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    let infoJson = "";
    for await (const chunk of infoProcess.stdout) {
      infoJson += chunk;
    }
    
    let filesize = 0;
    try {
      const jsonStart = infoJson.indexOf('{');
      if (jsonStart !== -1) {
        const cleanJson = infoJson.substring(jsonStart);
        const info = JSON.parse(cleanJson);
        // Only use EXACT filesize. filesize_approx causes network stream errors
        // because the stream closes before Content-Length is reached.
        filesize = info.filesize || 0; 
      }
    } catch(e) {
      console.error("Failed to parse JSON:", e);
    }

    // Now stream the actual video
    const subprocess = spawn(ytDlpPath, [
      url,
      "-o", "-", // Output to stdout
      "-f", "b",
      "--quiet",
      "--no-warnings",
      "--no-call-home",
      "--no-check-certificate"
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    const headers = new Headers();
    headers.set("Content-Type", "video/mp4");
    if (filesize > 0) {
      headers.set("Content-Length", filesize.toString());
    }
    headers.set("Content-Disposition", `attachment; filename="youtube_video.mp4"`);

    const webStream = nodeToWebStream(subprocess.stdout as any);

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("YouTube download error:", error);
    return NextResponse.json({ error: String(error), stack: error?.stack, message: error?.message }, { status: 500 });
  }
}
