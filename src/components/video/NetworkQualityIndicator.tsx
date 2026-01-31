import { Wifi, WifiOff } from "lucide-react";
import { NetworkQualityBars } from "./NetworkQualityBars";
import { cn } from "@/lib/utils";

interface NetworkQualityIndicatorProps {
  quality: number;
}

export function NetworkQualityIndicator({ quality }: NetworkQualityIndicatorProps) {
  const getLabel = () => {
    if (quality === 0) return "Connecting...";
    if (quality <= 2) return "Excellent";
    if (quality <= 4) return "Good";
    return "Poor";
  };

  const getTextColor = () => {
    if (quality === 0) return "text-zinc-400";
    if (quality <= 2) return "text-green-400";
    if (quality <= 4) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="flex items-center gap-2">
      {quality === 0 ? (
        <WifiOff className="w-4 h-4 text-zinc-400" />
      ) : (
        <Wifi className={cn("w-4 h-4", getTextColor())} />
      )}
      <NetworkQualityBars quality={quality} size="md" />
      <span className={cn("text-xs font-medium", getTextColor())}>
        {getLabel()}
      </span>
    </div>
  );
}
