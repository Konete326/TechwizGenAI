import { Loader } from "./Loader";
import { cn } from "@/lib/utils";

export function Spinner({ size = 16, className = "", ...props }) {
  return (
    <Loader
      size={size}
      className={cn("text-accent", className)}
      {...props}
    />
  );
}

export default Spinner;
