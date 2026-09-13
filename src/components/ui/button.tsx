import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { haptic, HAPTIC } from "@/lib/haptics";

// Duolingo-style 3D buttons: solid colour + a 4px darker bottom "ledge".
// On press the button drops 4px, the ledge disappears, and it plays a tap
// sound + light haptic — feels physical.
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[15px] font-extrabold select-none rounded-2xl transition-all duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-dl-green text-white shadow-btn-green hover:brightness-105 active:translate-y-[4px] active:shadow-none",
        primary: "bg-dl-purple text-white shadow-btn-purple hover:brightness-105 active:translate-y-[4px] active:shadow-none",
        secondary: "bg-white text-dl-grey shadow-btn-white hover:brightness-95 active:translate-y-[4px] active:shadow-none",
        gold: "bg-dl-gold text-[#854c00] shadow-btn-gold hover:brightness-105 active:translate-y-[4px] active:shadow-none",
        blue: "bg-dl-blue text-white shadow-btn-blue hover:brightness-105 active:translate-y-[4px] active:shadow-none",
        destructive: "bg-dl-red text-white shadow-btn-red hover:brightness-105 active:translate-y-[4px] active:shadow-none",
        ghost: "text-white/80 hover:text-white hover:bg-white/10 active:scale-95",
        link: "text-dl-purpleLight underline-offset-4 hover:underline",
        outline: "border-2 border-white/25 text-white/90 bg-transparent hover:bg-white/5 active:scale-[0.98]",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-10 rounded-2xl px-4",
        lg: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface Button3DProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Skip the tap sound/haptic (e.g. for rapid-fire taps). */
  quiet?: boolean;
}

const Button3D = React.forwardRef<HTMLButtonElement, Button3DProps>(
  ({ className, variant, size, asChild = false, quiet, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (!props.disabled && !quiet) {
            playSound("tap");
            haptic(HAPTIC.TAP);
          }
          onClick?.(e);
        }}
        {...props}
      />
    );
  }
);
Button3D.displayName = "Button3D";

export { Button3D, buttonVariants };
// Backwards-compatible alias so every existing <Button> gets the juice.
export const Button = Button3D;