"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTime, formatBytes } from "@/utils/format";
import { trimVideo } from "@/utils/ffmpeg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Scissors, Download, FileVideo, AlertCircle, CloudUpload, Trash2, Play, Link, Loader2 } from "lucide-react";

export default function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(100);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDownloadingYoutube, setIsDownloadingYoutube] = useState(false);
  const [youtubeDownloadProgress, setYoutubeDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);

  // Local string states for inputs to allow free typing
  const [startTimeStr, setStartTimeStr] = useState("00:00");
  const [endTimeStr, setEndTimeStr] = useState("00:00");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const outputUrlRef = useRef<string | null>(null);

  const revokeOutputUrl = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      revokeOutputUrl();
      setFile(selected);
      setVideoUrl(URL.createObjectURL(selected));
      setOutputBlob(null);
      setOutputUrl(null);
      setProgress(0);
      setErrorMsg(null);
      setStartTime(0);
      setEndTime(0);
      setStartTimeStr("00:00");
      setEndTimeStr("00:00");
    }
  }, []);

  const handleRemove = useCallback(() => {
    revokeOutputUrl();
    setFile(null);
    setVideoUrl(null);
    setOutputBlob(null);
    setOutputUrl(null);
    setProgress(0);
    setErrorMsg(null);
    setStartTime(0);
    setEndTime(100);
    setStartTimeStr("00:00");
    setEndTimeStr("00:00");
    setYoutubeUrl("");
  }, []);

  const handleYoutubeSubmit = useCallback(async () => {
    if (!youtubeUrl) return;
    setIsDownloadingYoutube(true);
    setYoutubeDownloadProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/youtube?url=${encodeURIComponent(youtubeUrl)}`);
      if (!res.ok) {
        let errStr = "Failed to fetch YouTube video";
        try {
          const err = await res.json();
          errStr = err.error || errStr;
        } catch(e) {}
        throw new Error(errStr);
      }
      
      const contentLength = res.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      setTotalBytes(total);
      let loaded = 0;
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Failed to read video stream");
      
      const chunks: BlobPart[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          setDownloadedBytes(loaded);
          if (total) {
            setYoutubeDownloadProgress(Math.round((loaded / total) * 100));
          }
        }
      }
      
      const blob = new Blob(chunks, { type: "video/mp4" });
      const newFile = new File([blob], "youtube_video.mp4", { type: "video/mp4" });
      
      revokeOutputUrl();
      setFile(newFile);
      setVideoUrl(URL.createObjectURL(newFile));
      setOutputBlob(null);
      setOutputUrl(null);
      setProgress(0);
      setErrorMsg(null);
      setStartTime(0);
      setEndTime(0);
      setStartTimeStr("00:00");
      setEndTimeStr("00:00");
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Failed to load YouTube video");
    } finally {
      setIsDownloadingYoutube(false);
      setYoutubeDownloadProgress(0);
    }
  }, [youtubeUrl]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      if (endTime === 0 || endTime > d) {
        setEndTime(d);
        setEndTimeStr(formatTime(d));
      }
      setStartTime(0);
      setStartTimeStr(formatTime(0));
    }
  }, [endTime]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleRangeChange = useCallback((value: number | readonly number[]) => {
    const values = Array.isArray(value) ? value : [value];
    const start = values[0] ?? 0;
    const end = values[1] ?? start;

    setStartTime(start);
    setEndTime(end);
    setStartTimeStr(formatTime(start));
    setEndTimeStr(formatTime(end));

    if (videoRef.current && Math.abs(videoRef.current.currentTime - start) > 0.5) {
      videoRef.current.currentTime = start;
    }
  }, []);

  const parseTime = useCallback((timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    let secs = 0;
    if (parts.some(isNaN)) return -1;

    if (parts.length === 3) {
      secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      secs = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      secs = parts[0];
    }
    return secs;
  }, []);

  const handleStartTimeBlur = useCallback(() => {
    const secs = parseTime(startTimeStr);
    if (secs >= 0 && secs <= endTime) {
      setStartTime(secs);
      setStartTimeStr(formatTime(secs));
      if (videoRef.current) videoRef.current.currentTime = secs;
    } else {
      setStartTimeStr(formatTime(startTime)); // Revert if invalid
    }
  }, [endTime, parseTime, startTime, startTimeStr]);

  const handleEndTimeBlur = useCallback(() => {
    const secs = parseTime(endTimeStr);
    if (secs >= startTime && secs <= duration) {
      setEndTime(secs);
      setEndTimeStr(formatTime(secs));
    } else {
      setEndTimeStr(formatTime(endTime)); // Revert if invalid
    }
  }, [duration, endTime, endTimeStr, parseTime, startTime]);

  const handleGenerate = useCallback(async () => {
    if (!file) return;
    revokeOutputUrl();
    setIsProcessing(true);
    setProgress(0);
    setOutputBlob(null);
    setOutputUrl(null);
    setErrorMsg(null);

    try {
      const blob = await trimVideo(file, startTime, endTime, (p) => {
        setProgress(Math.round(p * 100));
      });
      const nextUrl = URL.createObjectURL(blob);
      outputUrlRef.current = nextUrl;
      setOutputBlob(blob);
      setOutputUrl(nextUrl);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "An error occurred during video processing.");
    } finally {
      setIsProcessing(false);
    }
  }, [endTime, file, startTime]);

  useEffect(() => {
    return () => {
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
    };
  }, []);

  const downloadFileName = file
    ? `clip_${file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "") || "video"}.${(file.name.split(".").pop() || "mp4").toLowerCase()}`
    : "clip.mp4";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">

      {/* Uploader */}
      {!file && (
        <Card className="p-12 flex flex-col items-center justify-center border border-white/10 bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 via-transparent to-violet-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] relative z-10 group-hover:scale-110 transition-transform duration-500">
            <CloudUpload className="w-10 h-10 text-indigo-400" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-2xl font-bold mb-3 text-zinc-100 relative z-10 tracking-tight">Upload your video</h2>
          <p className="text-base text-zinc-400 mb-2 relative z-10 font-light">
            Drag & drop your video here or click to browse
          </p>
          <p className="text-xs text-zinc-500 mb-8 relative z-10">
            MP4, MOV, AVI up to 2GB
          </p>
          <div className="relative mb-10 flex flex-col items-center z-10">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-8 py-6 font-medium shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.7)] text-base">
              <Upload className="w-5 h-5 mr-2" /> Select File
            </Button>
            <input
              type="file"
              accept="video/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
          </div>

          <div className="w-full max-w-md flex items-center gap-4 mb-8 z-10">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">OR PASTE LINK</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <div className="w-full max-w-md z-10">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder="https://youtube.com/watch?v=..." 
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isDownloadingYoutube && handleYoutubeSubmit()}
                className="flex-1 bg-black/40 border-white/10 text-white placeholder:text-zinc-600 rounded-xl h-12 px-4 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all shadow-inner"
                disabled={isDownloadingYoutube}
              />
              <Button 
                onClick={isDownloadingYoutube ? undefined : handleYoutubeSubmit} 
                disabled={!youtubeUrl && !isDownloadingYoutube}
                className={`bg-rose-600 hover:bg-rose-500 text-white shrink-0 min-w-35 h-12 rounded-xl font-medium shadow-[0_0_20px_-5px_rgba(225,29,72,0.4)] transition-all overflow-hidden relative ${isDownloadingYoutube ? 'cursor-not-allowed opacity-100 hover:bg-rose-600' : 'hover:shadow-[0_0_30px_-5px_rgba(225,29,72,0.6)]'}`}
              >
                {isDownloadingYoutube && totalBytes > 0 && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-black/25 transition-all duration-200" 
                    style={{ width: `${youtubeDownloadProgress}%` }}
                  />
                )}
                {isDownloadingYoutube && totalBytes === 0 && downloadedBytes > 0 && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-black/25 transition-all duration-200 animate-pulse w-full" 
                  />
                )}
                <span className="relative z-10 flex items-center justify-center w-full font-medium">
                  {isDownloadingYoutube ? (
                    totalBytes > 0 ? `${youtubeDownloadProgress}%` : (downloadedBytes > 0 ? `${(downloadedBytes / 1024 / 1024).toFixed(1)} MB` : '0%')
                  ) : (
                    <><Link className="w-4 h-4 mr-2" /> Load Video</>
                  )}
                </span>
              </Button>
            </div>
            
            {errorMsg && !file && (
              <div className="mt-5 flex flex-col items-center justify-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 backdrop-blur-md rounded-2xl text-rose-400 shadow-sm animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-sm font-medium text-center">
                  <AlertCircle className="w-5 h-5" />
                  <span>
                    {errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('fetch') 
                      ? 'Network loss. Please check your connection.' 
                      : errorMsg}
                  </span>
                </div>
                <button 
                  onClick={handleYoutubeSubmit}
                  className="text-xs font-semibold px-5 py-2 bg-rose-500/20 border border-rose-500/30 rounded-full hover:bg-rose-500/30 text-rose-300 transition-colors shadow-sm"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Editor & Uploaded State */}
      {file && videoUrl && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
          {/* Actual Video Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <div className="lg:col-span-2 space-y-6">
              <Card className="overflow-hidden bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center relative aspect-video shadow-2xl ring-1 ring-white/5">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full"
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                />
              </Card>

              <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl shadow-xl">
                <div className="flex justify-between text-sm font-medium mb-5 text-zinc-400">
                  <span className="bg-white/10 px-3 py-1 rounded-full text-zinc-200">{formatTime(currentTime)}</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-zinc-200">{formatTime(duration)}</span>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-2">Start Time</label>
                      <Input
                        value={startTimeStr}
                        onChange={(e) => setStartTimeStr(e.target.value)}
                        onBlur={handleStartTimeBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleStartTimeBlur()}
                        className="font-mono bg-black/30 border-white/10 text-white rounded-xl h-11 focus-visible:ring-indigo-500 text-center text-lg"
                        placeholder="00:00"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-2">End Time</label>
                      <Input
                        value={endTimeStr}
                        onChange={(e) => setEndTimeStr(e.target.value)}
                        onBlur={handleEndTimeBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleEndTimeBlur()}
                        className="font-mono bg-black/30 border-white/10 text-white rounded-xl h-11 focus-visible:ring-indigo-500 text-center text-lg"
                        placeholder="00:00"
                      />
                    </div>
                  </div>

                  {duration > 0 && (
                    <Slider
                      value={[startTime, endTime]}
                      min={0}
                      max={duration}
                      step={0.1}
                      onValueChange={handleRangeChange}
                      className="mt-4"
                    />
                  )}
                </div>
              </Card>
              {/* Uploaded Video Card */}
              <div className="mt-8">
                <h3 className="font-semibold text-zinc-300 mb-4 text-sm uppercase tracking-widest">Source Material</h3>
                <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border-white/10 bg-white/5 backdrop-blur-md shadow-lg gap-4 group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 bg-black/50 rounded-xl relative flex items-center justify-center overflow-hidden shrink-0 border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                      <video src={videoUrl} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        {formatTime(duration)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-zinc-100 truncate max-w-50 sm:max-w-xs">{file.name}</h4>
                      <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/10">{formatBytes(file.size)}</span>
                        <span className="px-2 py-0.5 rounded bg-white/10">{file.name.split('.').pop()?.toUpperCase() || 'MP4'}</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleRemove}
                    className="text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 shrink-0 h-10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Replace
                  </Button>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-6 md:p-8 space-y-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl shadow-xl sticky top-8">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-4 text-zinc-100 text-lg">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <FileVideo className="w-4 h-4 text-indigo-400" />
                    </div>
                    Output Details
                  </h3>
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Duration</span>
                      <span className="font-mono text-zinc-200 font-medium bg-white/10 px-2 py-1 rounded">{formatTime(endTime - startTime)}</span>
                    </div>
                    <div className="h-px w-full bg-white/5" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Original Size</span>
                      <span className="font-mono text-zinc-200">{formatBytes(file.size)}</span>
                    </div>
                  </div>
                </div>

                {!outputBlob ? (
                  <div className="space-y-4">
                    {errorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-start gap-2 shadow-inner">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{errorMsg}</p>
                      </div>
                    )}

                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-14 text-base font-medium shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.7)]"
                      onClick={handleGenerate}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span className="flex items-center">
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          Processing {progress}%
                        </span>
                      ) : (
                        <>
                          <Scissors className="w-5 h-5 mr-2" /> Cut & Generate Clip
                        </>
                      )}
                    </Button>

                    {isProcessing && (
                      <div className="space-y-2">
                        <Progress value={progress} className="w-full h-2 bg-black/40 [&>div]:bg-indigo-500" />
                        <p className="text-xs text-center text-zinc-500 animate-pulse">This happens entirely in your browser</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5 p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 animate-in zoom-in-95 duration-500 shadow-inner">
                    <h4 className="text-emerald-400 font-semibold text-sm flex items-center justify-between">
                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" /> Success!</span>
                      <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded text-emerald-300">{formatBytes(outputBlob.size)}</span>
                    </h4>

                    <div className="w-full aspect-video bg-black/50 rounded-xl overflow-hidden border border-emerald-500/20 shadow-lg">
                      <video
                        src={outputUrl ?? undefined}
                        className="w-full h-full"
                        controls
                      />
                    </div>

                    <a
                      href={outputUrl ?? undefined}
                      download={downloadFileName}
                      className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 font-medium text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-500 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)]"
                    >
                      <Download className="mr-2 h-5 w-5" /> Download Clip
                    </a>
                    <Button
                      className="w-full h-12 rounded-xl border-white/10 hover:bg-white/10 hover:text-white text-zinc-300 transition-colors bg-transparent"
                      variant="outline"
                      onClick={() => {
                        revokeOutputUrl();
                        setOutputBlob(null);
                        setOutputUrl(null);
                      }}
                    >
                      Make Another Cut
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
