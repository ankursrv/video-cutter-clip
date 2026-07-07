import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg && isLoaded) return ffmpeg;
  
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg Log]', message);
    });
  }

  // Use UMD to avoid dynamic import issues in Webpack/Turbopack
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  try {
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });
    isLoaded = true;
    return ffmpeg;
  } catch (err) {
    ffmpeg = null; // Reset so we can try again
    throw err;
  }
};

export const trimVideo = async (
  file: File,
  startTime: number,
  endTime: number,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  const ff = await loadFFmpeg();

  const duration = endTime - startTime;

  const progressHandler = ({ progress, time }: { progress: number, time: number }) => {
    if (time !== undefined && duration > 0) {
      // time is in microseconds
      const currentSeconds = time / 1000000;
      let calcProgress = currentSeconds / duration;
      onProgress(Math.max(0, Math.min(1, calcProgress)));
    } else if (progress !== undefined) {
      // fallback
      onProgress(progress);
    }
  };

  ff.on('progress', progressHandler);

  const inputName = `input_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const outputName = `output.mp4`;

  // Write file to FFmpeg FS
  await ff.writeFile(inputName, await fetchFile(file));

  // Execute FFmpeg command
  // Use stream copy for blazing fast performance and to prevent browser hangs
  await ff.exec([
    '-ss', startTime.toString(),
    '-i', inputName,
    '-t', duration.toString(),
    '-c', 'copy',
    outputName
  ]);

  const data = await ff.readFile(outputName);
  const bytes = data instanceof Uint8Array
    ? data
    : typeof data === 'string'
      ? new TextEncoder().encode(data)
      : new Uint8Array(data as ArrayBufferLike);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });

  // Cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  ff.off('progress', progressHandler);

  return blob;
};
