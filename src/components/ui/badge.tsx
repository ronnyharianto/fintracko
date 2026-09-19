import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Shared tag primitive.
 *
 * Colored variants use a tinted background with a matching hairline border so
 * tags stay legible in both light and dark themes. `size="sm"` renders the
 * compact uppercase label used for categorical tags (e.g. budget interval);
 * the default size suits status and type tags.
 */
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        primary: "border border-primary/20 bg-primary/10 text-primary",
        success: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        info: "border border-blue-500/20 bg-blue-500/10 text-blue-600",
        warning: "border border-amber-500/20 bg-amber-500/10 text-amber-600",
        danger: "border border-red-500/20 bg-red-500/10 text-red-600",
        accent: "border border-violet-500/20 bg-violet-500/10 text-violet-600",
      },
      size: {
        default: "px-2 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/** Union of the available color variants, for variant lookup maps. */
export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export { Badge, badgeVariants };
