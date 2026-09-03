import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-[var(--radius-sm)] bg-zinc-200 dark:bg-zinc-800", className)}
      {...props}
    />
  );
}

export default Skeleton;
