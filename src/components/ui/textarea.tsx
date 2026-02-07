import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    /* Base styles = mobile. Use sm:, md:, lg: to override on larger screens */
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border-2 border-input bg-background text-base leading-relaxed py-3.5 px-4 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:py-2.5 sm:px-3 sm:rounded-md sm:border",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
