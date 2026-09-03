import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin text-accent", className)}
      {...props}
    />
  );
}

export default Spinner;
