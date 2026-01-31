import { cn } from "@/lib/utils";

interface NetworkQualityBarsProps {
  quality: number; // 0 = unknown, 1-2 = good, 3-4 = medium, 5-6 = poor
  size?: "sm" | "md";
}

export function NetworkQualityBars({ quality, size = "md" }: NetworkQualityBarsProps) {
  // Convert Agora quality (1-6, where 1 is best) to bars (3 = good, 2 = medium, 1 = poor)
  const getBarsLevel = () => {
    if (quality === 0) return 0; // Unknown
    if (quality <= 2) return 3; // Good
    if (quality <= 4) return 2; // Medium
    return 1; // Poor
  };

  const getColor = () => {
    const level = getBarsLevel();
    if (level === 3) return "bg-green-500";
    if (level === 2) return "bg-yellow-500";
    if (level === 1) return "bg-red-500";
    return "bg-zinc-500";
  };

  const barsLevel = getBarsLevel();
  const barColor = getColor();

  const barHeight = size === "sm" ? ["h-1.5", "h-2.5", "h-3.5"] : ["h-2", "h-3", "h-4"];
  const barWidth = size === "sm" ? "w-1" : "w-1.5";
  const gap = size === "sm" ? "gap-0.5" : "gap-1";

  return (
    <div className={cn("flex items-end", gap)} title={`Signal: ${barsLevel === 3 ? 'Good' : barsLevel === 2 ? 'Medium' : barsLevel === 1 ? 'Poor' : 'Unknown'}`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            barWidth,
            barHeight[index],
            "rounded-sm transition-colors",
            index < barsLevel ? barColor : "bg-zinc-600"
          )}
        />
      ))}
    </div>
  );
}
