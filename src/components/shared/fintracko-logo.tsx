import { cn } from '@/lib/utils';
import type { SVGProps } from 'react';

/**
 * Fintracko brand logo — a wallet + growth chart hybrid.
 *
 * The whole wallet is rendered in teal/emerald tones. The wallet body uses
 * the darker tone (`emerald-700` light / `emerald-400` dark) while the top
 * flap uses a brighter tone (`emerald-500` light / `emerald-300` dark), so
 * the flap is visibly lighter than the body. The growth-chart bars inherit
 * the brand `primary` token (a bright teal) for a consistent brand mark.
 *
 * @param className - forwarded to the root <svg> for sizing overrides
 * @param props     - standard SVG props
 */
export function FintrackoLogo({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
      {...props}
    >
      {/* 1. Wallet top flap (drawn first so body overlaps the bottom) */}
      <path
        d="M15 35h70V30c0-8.284-6.716-15-15-15H30c-8.284 0-15 6.716-15 15v5Z"
        className="fill-[#8e939e] dark:fill-[#aeb3c0]"
      />
      {/* 2. Wallet body (dark charcoal slate) */}
      <path
        d="M20 30C14.477 30 10 34.477 10 40v35c0 5.523 4.477 10 10 10h60c5.523 0 10-4.477 10-10V40c0-5.523-4.477-10-10-10H20Z"
        className="fill-[#4d515c] dark:fill-[#5c616c]"
      />
      {/* 3. Chart bars — vibrant emerald/mint green; aligned at y=70 bottom boundary.
          The tallest bar (Bar 3) rises up to y=22, overlapping the silver flap. */}
      <rect x="28" y="62" width="8" height="14" rx="2" className="fill-[#00b87c] dark:fill-[#00e08f]" />
      <rect x="41" y="52" width="8" height="24" rx="2" className="fill-[#00b87c] dark:fill-[#00e08f]" />
      <rect x="54" y="38" width="8" height="38" rx="2" className="fill-[#00b87c] dark:fill-[#00e08f]" />
      {/* 4. Wallet button */}
      <circle cx="76" cy="57" r="4" className="fill-white" />
    </svg>
  );
}
