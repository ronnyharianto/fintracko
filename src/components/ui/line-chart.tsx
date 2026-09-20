"use client";

import { useState } from "react";

import { useCanHover } from "@/lib/hooks/use-can-hover";
import { cn } from "@/lib/utils";

/**
 * Dependency-free SVG line chart.
 *
 * Renders a scaled polyline with a value axis, gridlines, an optional set of
 * per-point amount labels, and a zero baseline when the data range crosses it.
 * The viewBox scales uniformly to the container width.
 *
 * Every point is interactive: hovering, focusing, or tapping its column shows
 * a tooltip with the exact amount, a guide line, and a highlighted marker. This
 * is what makes the chart usable on touch, where a hover-only tooltip never
 * appears.
 *
 * When `showValueLabels` is off the plot grows to fill the freed horizontal
 * space and the value axis carries the magnitude.
 *
 * The `compact` variant uses a phone-sized viewBox so text renders at roughly
 * its intended pixel size on a narrow screen.
 */

export interface LineChartPoint {
  /** Full label used by the tooltip, e.g. "Apr 2026". */
  label: string;
  /** Short label for the x-axis tick, e.g. "Apr 26". Falls back to `label`. */
  axisLabel?: string;
  value: number;
}

interface LineChartProps {
  points: LineChartPoint[];
  /** Formats tooltips and the accessible summary. Defaults to a 2-decimal locale string. */
  valueFormatter?: (value: number) => string;
  /**
   * Formats the visible amount labels. Defaults to `valueFormatter`. Use a
   * compact notation here (e.g. "25.1M") to keep large amounts from crowding
   * the plot while tooltips still report the exact figure.
   */
  pointLabelFormatter?: (value: number) => string;
  /** Formats value-axis ticks. Defaults to a compact notation (e.g. "1.2K"). */
  axisFormatter?: (value: number) => string;
  /** Render an amount label above each point. Defaults to true. */
  showValueLabels?: boolean;
  /**
   * Phone-sized layout: a narrower viewBox keeps labels near 1:1 pixel size
   * instead of scaling a desktop-width chart down. Use with fewer points.
   */
  compact?: boolean;
  /** Message shown when there are no points. */
  emptyMessage?: string;
  className?: string;
}

interface Dimensions {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  tickCount: number;
}

const DIMENSIONS: Record<"default" | "compact", Dimensions> = {
  default: {
    width: 600,
    height: 280,
    padLeft: 56,
    padRight: 20,
    padTop: 20,
    padBottom: 30,
    tickCount: 5,
  },
  compact: {
    width: 360,
    height: 230,
    padLeft: 46,
    padRight: 16,
    padTop: 18,
    padBottom: 26,
    tickCount: 4,
  },
};

/** Matches the `text-[11px]` amount labels so padding can be estimated. */
const LABEL_FONT_SIZE = 11;
/** Rough average glyph width as a fraction of font size for formatted money. */
const AVG_CHAR_WIDTH_RATIO = 0.6;

/** Above this many points, per-point labels get too dense to read. */
const MAX_LABELLED_POINTS = 8;
/** Vertical clearance a point label needs before it is skipped. */
const LABEL_MIN_GAP = 13;

const compactFormatter = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

/** Round a rough interval up to a 1 / 2 / 2.5 / 5 / 10 multiple. */
function niceStep(range: number, count: number): number {
  const rough = range / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** A rounded value range and the ticks that fall inside it. */
function niceScale(
  min: number,
  max: number,
  count: number,
): { min: number; max: number; ticks: number[] } {
  if (min === max) {
    // A flat series still needs a non-zero span; keep zero visible when it is 0.
    if (min === 0) return { min: 0, max: 1, ticks: [0, 0.5, 1] };
    return { min: min - 1, max: max + 1, ticks: [min - 1, min, max, max + 1] };
  }

  const step = niceStep(max - min, count);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }

  return { min: niceMin, max: niceMax, ticks };
}

interface LabelCandidate {
  x: number;
  y: number;
  text: string;
}

/**
 * Place amount labels, dropping any that would collide with one already
 * placed. Callers pass candidates in priority order, so the most important
 * labels win a contested position.
 */
function placeLabels(
  candidates: LabelCandidate[],
  minY: number,
): { x: number; y: number; text: string }[] {
  const placed: { x: number; y: number; text: string }[] = [];

  for (const candidate of candidates) {
    // Prefer above the point, but tuck below when the point sits near the top.
    let y = candidate.y - 10;
    if (y < minY) y = candidate.y + 16;

    const collides = placed.some(
      (label) =>
        Math.abs(label.x - candidate.x) < 56 &&
        Math.abs(label.y - y) < LABEL_MIN_GAP,
    );
    if (!collides) placed.push({ x: candidate.x, y, text: candidate.text });
  }

  return placed;
}

export function LineChart({
  points,
  valueFormatter = (value) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  pointLabelFormatter,
  axisFormatter = compactFormatter,
  showValueLabels = true,
  compact = false,
  emptyMessage = "No data to display.",
  className,
}: LineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const canHover = useCanHover();
  const dim = compact ? DIMENSIONS.compact : DIMENSIONS.default;

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const valueTexts = points.map((point) => valueFormatter(point.value));

  const labelsEnabled =
    showValueLabels && points.length <= MAX_LABELLED_POINTS;
  const labelFormatter = pointLabelFormatter ?? valueFormatter;
  const labelTexts = labelsEnabled
    ? points.map((point) => labelFormatter(point.value))
    : [];

  // Reserve half the widest label actually drawn on each side so a centered
  // label on the first/last point stays inside the chart instead of clipping.
  // With labels off the base padding applies and the plot keeps the room.
  const longestChars = labelTexts.length
    ? Math.max(...labelTexts.map((text) => text.length))
    : 0;
  const textHalfWidth = longestChars
    ? Math.ceil((longestChars * AVG_CHAR_WIDTH_RATIO * LABEL_FONT_SIZE) / 2) + 2
    : 0;
  const padLeft = Math.max(dim.padLeft, textHalfWidth);
  const padRight = Math.max(dim.padRight, textHalfWidth);

  const scale = niceScale(
    Math.min(...values),
    Math.max(...values),
    dim.tickCount,
  );
  const span = scale.max - scale.min || 1;

  const innerWidth = dim.width - padLeft - padRight;
  const innerHeight = dim.height - dim.padTop - dim.padBottom;

  const xAt = (index: number) =>
    points.length === 1
      ? padLeft + innerWidth / 2
      : padLeft + (index / (points.length - 1)) * innerWidth;
  const yAt = (value: number) =>
    dim.padTop + (1 - (value - scale.min) / span) * innerHeight;

  const coords = points.map((point, index) => ({
    x: xAt(index),
    y: yAt(point.value),
  }));
  const linePoints = coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
  const baselineY = yAt(scale.min);

  const areaPath = `M ${coords[0].x},${baselineY} L ${linePoints
    .split(" ")
    .join(" L ")} L ${coords[coords.length - 1].x},${baselineY} Z`;

  const candidates: LabelCandidate[] = points.map((point, index) => ({
    x: coords[index].x,
    y: coords[index].y,
    text: labelTexts[index],
  }));
  // The current month (last point) matters most, so it wins a contested spot,
  // followed by the first point; the middle labels fill in around them.
  const orderedCandidates =
    candidates.length === 1
      ? candidates
      : [candidates[candidates.length - 1], candidates[0], ...candidates.slice(1, -1)];

  const labels = labelsEnabled
    ? placeLabels(orderedCandidates, dim.padTop)
    : [];

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const showZeroLine = dataMin <= 0 && dataMax >= 0;

  // Guard against a stale index after the data changes (e.g. workspace switch).
  const active =
    activeIndex !== null && activeIndex < points.length ? activeIndex : null;

  const ariaLabel = `Balance trend from ${points[0].label} (${valueTexts[0]}) to ${
    points[points.length - 1].label
  } (${valueTexts[valueTexts.length - 1]}).`;

  // Width of the clickable column centered on each point.
  const bandWidth =
    points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;

  const tooltipX = active !== null ? (coords[active].x / dim.width) * 100 : 0;
  const tooltipY = active !== null ? (coords[active].y / dim.height) * 100 : 0;
  // Keep the tooltip inside the chart at the edges instead of letting the card
  // clip it.
  const tooltipTranslateX =
    tooltipX < 18 ? "0%" : tooltipX > 82 ? "-100%" : "-50%";
  const tooltipTranslateY = tooltipY < 28 ? "12px" : "calc(-100% - 12px)";

  return (
    <div
      className={cn("relative", className)}
      // Only pointer devices clear on leave; on touch this would dismiss the
      // tooltip the user just opened with a tap. Tapping the chart background
      // dismisses it instead (point clicks stop propagation).
      onMouseLeave={canHover ? () => setActiveIndex(null) : undefined}
      onClick={canHover ? undefined : () => setActiveIndex(null)}
    >
      <svg
        viewBox={`0 0 ${dim.width} ${dim.height}`}
        className="h-auto w-full"
        role="group"
        aria-label={ariaLabel}
      >
        {/* Gridlines and value-axis ticks */}
        {scale.ticks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={dim.width - padRight}
                y1={y}
                y2={y}
                strokeWidth="1"
                className="stroke-muted-foreground/15"
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {axisFormatter(tick)}
              </text>
            </g>
          );
        })}

        {showZeroLine && (
          <line
            x1={padLeft}
            x2={dim.width - padRight}
            y1={yAt(0)}
            y2={yAt(0)}
            strokeWidth="1"
            strokeDasharray="4 4"
            className="stroke-muted-foreground/40"
          />
        )}

        <path d={areaPath} className="fill-chart-2/10" />

        <polyline
          points={linePoints}
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-chart-2"
        />

        {active !== null && (
          <g>
            <line
              x1={coords[active].x}
              x2={coords[active].x}
              y1={dim.padTop}
              y2={dim.height - dim.padBottom}
              strokeWidth="1"
              strokeDasharray="3 3"
              className="stroke-chart-2/50"
            />
            <circle
              cx={coords[active].x}
              cy={coords[active].y}
              r={9}
              className="fill-chart-2/20"
            />
          </g>
        )}

        {coords.map((coord, index) => {
          const isLast = index === points.length - 1;
          const isActive = active === index;
          return (
            <circle
              key={points[index].label}
              cx={coord.x}
              cy={coord.y}
              r={isActive ? 6 : isLast ? 5 : 3.5}
              className={cn(
                isLast || isActive
                  ? "fill-chart-2"
                  : "fill-background stroke-chart-2",
                isActive && "stroke-chart-2",
              )}
              strokeWidth={2}
            />
          );
        })}

        {labels.map((label) => (
          <text
            key={`${label.x}-${label.text}`}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            className="fill-foreground text-[11px] font-medium"
          >
            {label.text}
          </text>
        ))}

        {points.map((point, index) => (
          <text
            key={point.label}
            x={coords[index].x}
            y={dim.height - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {point.axisLabel ?? point.label}
          </text>
        ))}

        {/* Transparent hit columns: hover, tap, and keyboard focus all select
            the point they belong to. */}
        {points.map((point, index) => {
          const half = bandWidth / 2;
          const x = Math.max(0, coords[index].x - half);
          const width = Math.min(dim.width, coords[index].x + half) - x;
          return (
            <rect
              key={`hit-${point.label}`}
              x={x}
              y={0}
              width={width}
              height={dim.height}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="button"
              aria-label={`${point.label}: ${valueTexts[index]}`}
              className="cursor-pointer focus:outline-none"
              onMouseEnter={canHover ? () => setActiveIndex(index) : undefined}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              // Select idempotently: touch fires focus before click, so a
              // toggle here would cancel the selection it just made.
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(index);
              }}
            />
          );
        })}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          style={{
            left: `${tooltipX}%`,
            top: `${tooltipY}%`,
            transform: `translate(${tooltipTranslateX}, ${tooltipTranslateY})`,
          }}
        >
          <span className="font-medium">{points[active].label}</span>
          <span className="ml-1.5 tabular-nums">{valueTexts[active]}</span>
        </div>
      )}
    </div>
  );
}
