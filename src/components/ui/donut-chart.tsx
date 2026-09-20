"use client";

import { useState } from "react";

import { useCanHover } from "@/lib/hooks/use-can-hover";
import { cn } from "@/lib/utils";

/**
 * Dependency-free SVG donut chart with an adjacent legend.
 *
 * Colors come from the `--chart-*` design tokens (exposed as Tailwind
 * `stroke-chart-N` / `bg-chart-N` utilities). Keeping the class strings literal
 * here lets Tailwind's compiler see them; never build them dynamically.
 *
 * Every arc is interactive: hovering, focusing, or tapping it (or its legend
 * row) highlights that slice, dims the others, and swaps the center readout for
 * the slice's share and amount. This is the only place the percentage is shown,
 * so the legend stays clean.
 */

/** The donut's rendered size in px (Tailwind `h-48` / `w-48`). */
const DONUT_SIZE_PX = 192;
/** Hole diameter as a fraction of the box: `(2r - strokeWidth) / viewBox`. */
const HOLE_RATIO = (2 * 15.9155 - 5) / 42;
/** Rendered hole diameter, used to size the center amount. */
const holeDiameter = DONUT_SIZE_PX * HOLE_RATIO;
/**
 * Worst-case average glyph width as a fraction of the font size. Currency
 * digits are the widest glyphs, so sizing against this is conservative.
 */
const CHAR_WIDTH_EM = 0.62;

/** Arc + legend color pairs, cycled in order. */
const PALETTE = [
  { stroke: "stroke-chart-1", bg: "bg-chart-1" },
  { stroke: "stroke-chart-2", bg: "bg-chart-2" },
  { stroke: "stroke-chart-3", bg: "bg-chart-3" },
  { stroke: "stroke-chart-4", bg: "bg-chart-4" },
  { stroke: "stroke-chart-5", bg: "bg-chart-5" },
] as const;

export interface DonutSlice {
  /** Legend label, e.g. a parent category name. */
  label: string;
  /** Positive magnitude used for the arc share. */
  value: number;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /**
   * Denominator for the slice shares. Pass the overall total when `slices` is a
   * subset (e.g. a Top 5 view) so percentages stay relative to the whole; the
   * arcs then leave an honest gap for the unshown remainder. Defaults to the
   * sum of `slices`.
   */
  total?: number;
  /** Small caption under the center value (e.g. "Total spent"). */
  centerLabel?: string;
  /** Preformatted center value. */
  centerValue?: string;
  /** Formats a slice value in the legend. Defaults to a 2-decimal locale string. */
  valueFormatter?: (value: number) => string;
  /** Message shown when there are no slices. */
  emptyMessage?: string;
  className?: string;
}

export function DonutChart({
  slices,
  total: totalProp,
  centerLabel,
  centerValue,
  valueFormatter = (value) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  emptyMessage = "No data to display.",
  className,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const canHover = useCanHover();

  const slicesTotal = slices.reduce((sum, slice) => sum + slice.value, 0);
  const total = totalProp ?? slicesTotal;

  if (slices.length === 0 || total <= 0) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const ariaLabel = `Expense breakdown by category: ${slices
    .map(
      (slice) =>
        `${slice.label} ${((slice.value / total) * 100).toFixed(1)} percent`,
    )
    .join(", ")}.`;

  // Keep the center amount inside the hole however long it gets. The font is
  // sized from the hole diameter and a worst-case glyph width rather than a
  // fixed step, so even a billions/trillions value cannot overlap the ring.
  const centerValueLength = centerValue?.length ?? 0;
  const centerFontSize = centerValueLength
    ? Math.max(
        9,
        Math.min(18, Math.floor(holeDiameter / (centerValueLength * CHAR_WIDTH_EM))),
      )
    : 18;

  // Precompute each arc's share and start offset without mutating shared state
  // while rendering.
  const arcs = slices.map((slice, index) => {
    const percent = (slice.value / total) * 100;
    const offset = slices
      .slice(0, index)
      .reduce(
        (sum, previous) => sum + (previous.value / total) * 100,
        0,
      );
    return {
      slice,
      percent,
      offset,
      palette: PALETTE[index % PALETTE.length],
    };
  });

  // Guard against a stale index after the data changes (e.g. workspace switch).
  const active =
    activeIndex !== null && activeIndex < slices.length ? activeIndex : null;

  return (
    <div
      className={cn(
        // Stack on phones and tablets, where a side-by-side legend would be
        // too narrow; only wide desktops have room for both.
        "flex flex-col items-center gap-6 xl:flex-row",
        className,
      )}
      // Pointer devices clear on leave; on touch that would dismiss the slice
      // the user just tapped, so tapping the background clears instead.
      onMouseLeave={canHover ? () => setActiveIndex(null) : undefined}
      onClick={canHover ? undefined : () => setActiveIndex(null)}
    >
      <div className="relative h-48 w-48 shrink-0">
        <svg
          viewBox="0 0 42 42"
          className="h-full w-full"
          role="group"
          aria-label={ariaLabel}
        >
          <circle
            cx="21"
            cy="21"
            r="15.9155"
            fill="none"
            strokeWidth="5"
            className="stroke-muted"
          />
          <g transform="rotate(-90 21 21)">
            {arcs.map((arc, index) => {
              const isActive = active === index;
              const isDimmed = active !== null && !isActive;
              return (
                <circle
                  key={arc.slice.label}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  strokeWidth={isActive ? 7 : 5}
                  pathLength={100}
                  strokeDasharray={`${arc.percent} ${100 - arc.percent}`}
                  strokeDashoffset={-arc.offset}
                  className={cn(
                    "transition-opacity duration-200",
                    arc.palette.stroke,
                    isDimmed && "opacity-25",
                  )}
                />
              );
            })}

            {/* Thicker transparent arcs so thin slices are still easy to hit
                and to tap. */}
            {arcs.map((arc, index) => (
              <circle
                key={`hit-${arc.slice.label}`}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke="transparent"
                strokeWidth="12"
                pathLength={100}
                strokeDasharray={`${arc.percent} ${100 - arc.percent}`}
                strokeDashoffset={-arc.offset}
                pointerEvents="stroke"
                tabIndex={0}
                role="button"
                aria-label={`${arc.slice.label}: ${arc.percent.toFixed(
                  1,
                )} percent, ${valueFormatter(arc.slice.value)}`}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={canHover ? () => setActiveIndex(index) : undefined}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex(index);
                }}
              />
            ))}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          {active !== null ? (
            <>
              <span className="max-w-full truncate text-xs text-muted-foreground">
                {slices[active].label}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {arcs[active].percent.toFixed(1)}%
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {valueFormatter(slices[active].value)}
              </span>
            </>
          ) : (
            <>
              {centerValue && (
                <span
                  className="max-w-full font-semibold tabular-nums"
                  style={{ fontSize: centerFontSize }}
                >
                  {centerValue}
                </span>
              )}
              {centerLabel && (
                <span className="text-xs text-muted-foreground">
                  {centerLabel}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <ul className="w-full space-y-1">
        {slices.map((slice, index) => {
          const palette = PALETTE[index % PALETTE.length];
          const isActive = active === index;
          return (
            <li key={slice.label}>
              <button
                type="button"
                aria-pressed={isActive}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-sm transition-colors",
                  isActive ? "bg-muted" : "hover:bg-muted/50",
                )}
                onMouseEnter={canHover ? () => setActiveIndex(index) : undefined}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex(index);
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      palette.bg,
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{slice.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {valueFormatter(slice.value)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
