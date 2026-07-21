import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-kawaii-purple focus:ring-offset-2 dark:ring-offset-dark-bg",
  {
    variants: {
      variant: {
        default: "bg-kawaii-lavender/30 text-kawaii-purple dark:bg-dark-surface dark:text-kawaii-lavender",
        secondary: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
        destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        outline: "border-2 border-kawaii-lavender/30 text-slate-600 dark:border-dark-surface dark:text-slate-300",
        success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
