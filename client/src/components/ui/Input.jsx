import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      data-slot="input"
      ref={ref}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-1 text-base text-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-blue-500/60 focus-visible:ring-1 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/50 md:text-sm",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export default Input;
