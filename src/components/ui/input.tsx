import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#1f2233] dark:text-white dark:ring-offset-[#0a0a1a] dark:placeholder:text-white/40 dark:focus-visible:ring-dl-purple",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
