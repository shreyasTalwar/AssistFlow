import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-indigo-500/30 bg-indigo-500/15 text-indigo-300",
        secondary:
          "border-slate-500/30 bg-slate-500/15 text-slate-300",
        outline: "text-slate-300 border-white/10",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-300",
        emerald:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        purple:
          "border-purple-500/30 bg-purple-500/15 text-purple-300",
        amber:
          "border-amber-500/30 bg-amber-500/15 text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
