import { ImageResponse } from "next/og";

/**
 * Apple touch icon (`/apple-icon`), generated with `next/og`.
 *
 * Uses the fixed light-mode brand palette (teal on white) — apple icons are
 * rendered by iOS without transparency or dark-mode awareness.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <svg viewBox="0 0 100 100" style={{ width: 140, height: 140 }}>
          <path
            d="M15 35h70V30c0-8.284-6.716-15-15-15H30c-8.284 0-15 6.716-15 15v5Z"
            fill="#8e939e"
          />
          <path
            d="M20 30C14.477 30 10 34.477 10 40v35c0 5.523 4.477 10 10 10h60c5.523 0 10-4.477 10-10V40c0-5.523-4.477-10-10-10H20Z"
            fill="#4d515c"
          />
          <rect x="28" y="62" width="8" height="14" rx="2" fill="#00b87c" />
          <rect x="41" y="52" width="8" height="24" rx="2" fill="#00b87c" />
          <rect x="54" y="38" width="8" height="38" rx="2" fill="#00b87c" />
          <circle cx="76" cy="57" r="4" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
