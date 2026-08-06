import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      variant: {
        default: "bg-slate-950 text-white hover:bg-slate-800",
        outline:
          "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
