import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageAudioProps {
  src: string;
  duration?: number | null;
  fromMe?: boolean;
}

export function MessageAudio({ src, duration, fromMe = false }: MessageAudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `whatsapp-audio-${Date.now()}.ogg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[240px] max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className={`h-10 w-10 rounded-full flex-shrink-0 ${
          fromMe 
            ? "hover:bg-primary-foreground/20" 
            : "hover:bg-secondary"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </Button>

      {/* Waveform / Progress Bar */}
      <div className="flex-1 space-y-1">
        <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full transition-all ${
              fromMe ? "bg-primary-foreground/60" : "bg-primary/60"
            }`}
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max={audioDuration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
        <div className={`text-xs ${fromMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </div>
      </div>

      {/* Download Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDownload}
        className={`h-8 w-8 flex-shrink-0 ${
          fromMe 
            ? "hover:bg-primary-foreground/20" 
            : "hover:bg-secondary"
        }`}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
}
