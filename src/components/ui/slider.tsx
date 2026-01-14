import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sliderVariants = cva("", {
  variants: {
    variant: {
      default: "",
      progress: "", // Green for progress (music player seek, course progress)
      volume: "", // Blue for volume
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant, ...props }, ref) => {
  const trackClass = variant === "progress" 
    ? "bg-muted" 
    : variant === "volume" 
    ? "bg-muted" 
    : "bg-muted";
    
  const rangeClass = variant === "progress" 
    ? "bg-success" 
    : variant === "volume" 
    ? "bg-accent" 
    : "bg-success";
    
  const thumbClass = variant === "progress" 
    ? "border-success" 
    : variant === "volume" 
    ? "border-accent" 
    : "border-success";

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-action-pan-y select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className={cn("relative h-2 w-full grow overflow-hidden rounded-full", trackClass)}>
        <SliderPrimitive.Range className={cn("absolute h-full", rangeClass)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn("block h-5 w-5 rounded-full border-2 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", thumbClass)} />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
