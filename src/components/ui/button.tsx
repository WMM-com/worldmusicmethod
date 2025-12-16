import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary CTA - Red background
        default: "bg-primary text-primary-foreground hover:bg-[hsl(355,74%,32%)]",
        // Secondary - Yellow outline
        secondary: "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground",
        // Tertiary - Blue background
        tertiary: "bg-accent text-accent-foreground hover:bg-[hsl(222,100%,10%)]",
        // Destructive - Same as primary (red)
        destructive: "bg-destructive text-destructive-foreground hover:bg-[hsl(355,74%,32%)]",
        // Outline - Neutral
        outline: "border border-border bg-transparent hover:bg-card hover:text-foreground",
        // Ghost
        ghost: "hover:bg-card hover:text-foreground",
        // Link - Yellow
        link: "text-secondary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
