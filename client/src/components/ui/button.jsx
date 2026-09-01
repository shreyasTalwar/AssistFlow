import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25",
        emerald:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/25",
        purple:
          "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/25",
        blue:
          "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/25",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/25",
        outline:
          "border border-white/10 bg-slate-900/80 hover:bg-slate-800 text-slate-200",
        secondary:
          "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/10",
        ghost: "hover:bg-white/10 text-slate-300 hover:text-white",
        link: "text-indigo-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
