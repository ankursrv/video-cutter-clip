"use client";

import { useState, useRef } from "react";
import { formatTime, formatBytes } from "@/utils/format";
import { trimVideo } from "@/utils/ffmpeg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Scissors, Download, FileVideo, AlertCircle, XCircle, CloudUpload, Trash2, Play } from "lucide-react";

export default function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(100);

  // Local string states for inputs to allow free typing
  const [startTimeStr, setStartTimeStr] = useState("00:00");
  const [endTimeStr, setEndTimeStr] = useState("00:00");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setVideoUrl(URL.createObjectURL(selected));
      setOutputBlob(null);
      setProgress(0);
      setErrorMsg(null);
      setStartTime(0);
      setEndTime(0);
      setStartTimeStr("00:00");
      setEndTimeStr("00:00");
    }
  };

  const handleRemove = () => {
    setFile(null);
    setVideoUrl(null);
    setOutputBlob(null);
    setProgress(0);
    setErrorMsg(null);
    setStartTime(0);
    setEndTime(100);
    setStartTimeStr("00:00");
    setEndTimeStr("00:00");
  };

  const handleLoadedMetadata = () => {
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
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleRangeChange = (values: number[]) => {
    setStartTime(values[0]);
    setEndTime(values[1]);
    setStartTimeStr(formatTime(values[0]));
    setEndTimeStr(formatTime(values[1]));

    // Seek video player to start time when dragging
    if (videoRef.current && Math.abs(videoRef.current.currentTime - values[0]) > 0.5) {
      videoRef.current.currentTime = values[0];
    }
  };

  const parseTime = (timeStr: string) => {
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
  };

  const handleStartTimeBlur = () => {
    const secs = parseTime(startTimeStr);
    if (secs >= 0 && secs <= endTime) {
      setStartTime(secs);
      setStartTimeStr(formatTime(secs));
      if (videoRef.current) videoRef.current.currentTime = secs;
    } else {
      setStartTimeStr(formatTime(startTime)); // Revert if invalid
    }
  };

  const handleEndTimeBlur = () => {
    const secs = parseTime(endTimeStr);
    if (secs >= startTime && secs <= duration) {
      setEndTime(secs);
      setEndTimeStr(formatTime(secs));
    } else {
      setEndTimeStr(formatTime(endTime)); // Revert if invalid
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setOutputBlob(null);
    setErrorMsg(null);

    try {
      const blob = await trimVideo(file, startTime, endTime, (p) => {
        setProgress(Math.round(p * 100));
      });
      setOutputBlob(blob);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "An error occurred during video processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">

      {/* Uploader */}
      {!file && (
        <Card className="p-12 flex flex-col items-center justify-center border-dashed border-2 border-indigo-200/80 bg-[#f8f9ff] dark:bg-indigo-950/10 dark:border-indigo-800/50 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-[#f1efff] dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
            <CloudUpload className="w-8 h-8 text-indigo-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-zinc-200">Upload your video</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            Drag & drop your video here or click to browse
          </p>
          <p className="text-xs text-zinc-400 mb-6">
            MP4, MOV, AVI up to 2GB
          </p>
          <div className="relative">
            <Button className="bg-[#635bff] hover:bg-[#534be5] text-white rounded-lg px-6 font-medium shadow-sm transition-colors">
              <Upload className="w-4 h-4 mr-2" /> Upload file
            </Button>
            <input
              type="file"
              accept="video/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
          </div>
        </Card>
      )}

      {/* Editor & Uploaded State */}
      {file && videoUrl && (
        <div className="space-y-6">
          {/* Actual Video Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden bg-black flex items-center justify-center relative aspect-video">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full"
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                />
              </Card>

              <Card className="p-6">
                <div className="flex justify-between text-sm font-medium mb-4">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500 block mb-1">Start Time (HH:MM:SS)</label>
                      <Input
                        value={startTimeStr}
                        onChange={(e) => setStartTimeStr(e.target.value)}
                        onBlur={handleStartTimeBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleStartTimeBlur()}
                        className="font-mono"
                        placeholder="00:00"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500 block mb-1">End Time (HH:MM:SS)</label>
                      <Input
                        value={endTimeStr}
                        onChange={(e) => setEndTimeStr(e.target.value)}
                        onBlur={handleEndTimeBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleEndTimeBlur()}
                        className="font-mono"
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
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 text-lg">Uploaded video</h3>
                <Card className="p-3 flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 bg-black rounded-lg relative flex items-center justify-center overflow-hidden shrink-0">
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
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-xs">{file.name}</h4>
                      <p className="text-sm text-zinc-500 mt-1">
                        {formatBytes(file.size)} • {file.name.split('.').pop()?.toUpperCase() || 'MP4'} • {formatTime(duration)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRemove}
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </Button>
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <FileVideo className="w-4 h-4" /> Clip Details
                  </h3>
                  <ul className="text-sm space-y-2 text-zinc-600 dark:text-zinc-400">
                    <li className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-mono">{formatTime(endTime - startTime)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Original Size:</span>
                      <span className="font-mono">{formatBytes(file.size)}</span>
                    </li>
                  </ul>
                </div>

                {!outputBlob ? (
                  <div className="space-y-4">
                    {errorMsg && (
                      <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm rounded-md flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{errorMsg}</p>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleGenerate}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        `Processing ${progress}%`
                      ) : (
                        <>
                          <Scissors className="w-4 h-4 mr-2" /> Generate Clip
                        </>
                      )}
                    </Button>

                    {isProcessing && (
                      <Progress value={progress} className="w-full" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
                    <h4 className="text-green-800 dark:text-green-300 font-medium text-sm flex items-center justify-between">
                      Success!
                      <span className="text-xs">{formatBytes(outputBlob.size)}</span>
                    </h4>

                    <div className="w-full aspect-video bg-black rounded-md overflow-hidden border border-green-200/50 dark:border-green-900/50">
                      <video
                        src={URL.createObjectURL(outputBlob)}
                        className="w-full h-full"
                        controls
                      />
                    </div>

                    <Button
                      className="w-full"
                      variant="default"
                      asChild
                    >
                      <a
                        href={URL.createObjectURL(outputBlob)}
                        download={`clip_${file.name}`}
                        className="flex items-center justify-center"
                      >
                        <Download className="w-4 h-4 mr-2" /> Download MP4
                      </a>
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setOutputBlob(null)}
                    >
                      Edit Again
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
