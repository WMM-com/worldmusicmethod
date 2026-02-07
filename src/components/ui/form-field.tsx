/* Base styles = mobile. Use sm:, md:, lg: to override on larger screens */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldWrapperProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Mobile-first form field wrapper.
 * Provides consistent spacing, label, error, and hint styles across all forms.
 */
export function FormFieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldWrapperProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm font-medium block">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

interface FormGroupProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Mobile-first form group container.
 * Stacks fields with consistent gap-6 spacing.
 */
export function FormGroup({ className, children }: FormGroupProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {children}
    </div>
  );
}

interface FormActionsProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Mobile-first form actions bar.
 * Full-width stacked buttons on mobile, inline on sm+.
 */
export function FormActions({ className, children }: FormActionsProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end",
      className
    )}>
      {children}
    </div>
  );
}
