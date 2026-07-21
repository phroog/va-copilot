import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-dark-bg dark:focus-visible:ring-kawaii-purple rounded-full squishy",
  {
    variants: {
      variant: {
        default: "bg-kawaii-purple text-white hover:bg-purple-400 dark:bg-kawaii-purple dark:hover:bg-purple-400",
        destructive: "bg-kawaii-coral text-white hover:bg-red-400 dark:bg-red-700 dark:hover:bg-red-600",
        outline: "border-2 border-kawaii-purple/30 bg-white hover:bg-kawaii-lavender/30 hover:text-kawaii-purple dark:border-kawaii-purple/50 dark:bg-dark-card dark:hover:bg-dark-surface dark:hover:text-kawaii-purple",
        secondary: "bg-kawaii-pink text-white hover:bg-pink-400 dark:bg-pink-700 dark:hover:bg-pink-600",
        ghost: "hover:bg-kawaii-lavender/30 hover:text-kawaii-purple dark:hover:bg-dark-surface dark:hover:text-kawaii-lavender",
        link: "text-kawaii-purple underline-offset-4 hover:underline dark:text-kawaii-lavender",
        primary: "bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white hover:from-purple-400 hover:to-pink-400 shadow-lg shadow-kawaii-purple/20 dark:from-kawaii-purple dark:to-kawaii-pink",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-full px-4",
        lg: "h-12 rounded-full px-8 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
