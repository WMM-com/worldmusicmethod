import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      /* Base styles = mobile. Use sm:, md:, lg: to override on larger screens */
      <input
        type={type}
        className={cn(
          "flex w-full rounded-xl border-2 border-input bg-background text-base leading-relaxed py-3.5 px-4 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:py-2.5 sm:px-3 sm:rounded-md sm:border",
          // Fix date picker icon visibility
          type === "date" && "date-input-fix",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
