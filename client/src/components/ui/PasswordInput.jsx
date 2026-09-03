import * as React from "react";
import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export const PasswordInput = React.forwardRef(({ className, label, id: customId, ...props }, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return (
    <div className="grid w-full items-center gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          className={cn("pe-10", className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
