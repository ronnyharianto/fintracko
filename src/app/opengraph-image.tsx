import { ImageResponse } from "next/og";

/**
 * Site-wide OpenGraph image (`/opengraph-image`).
 *
 * Generated at build time with `next/og` so no binary asset needs to be kept
 * in sync with the brand. 1200x630 is the canonical social-card size. Colors
 * are fixed literals (the generated route cannot consume Tailwind design
 * tokens) and mirror the brand: teal `#0f766e`/`#14b8a6`, emerald `#00b87c`,
 * dark surface `#0f172a`.
 */
export const alt = "Fintracko — free collaborative budget and expense tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(20,184,166,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(0,184,124,0.2), transparent 45%)",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginBottom: 40,
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: 96, height: 96 }}>
            <path
              d="M15 35h70V30c0-8.284-6.716-15-15-15H30c-8.284 0-15 6.716-15 15v5Z"
              fill="#aeb3c0"
            />
            <path
              d="M20 30C14.477 30 10 34.477 10 40v35c0 5.523 4.477 10 10 10h60c5.523 0 10-4.477 10-10V40c0-5.523-4.477-10-10-10H20Z"
              fill="#5c616c"
            />
            <rect x="28" y="62" width="8" height="14" rx="2" fill="#00e08f" />
            <rect x="41" y="52" width="8" height="24" rx="2" fill="#00e08f" />
            <rect x="54" y="38" width="8" height="38" rx="2" fill="#00e08f" />
            <circle cx="76" cy="57" r="4" fill="#ffffff" />
          </svg>
          <div style={{ fontSize: 88, fontWeight: 700 }}>Fintracko</div>
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 600,
            color: "#14b8a6",
            textAlign: "center",
            display: "flex",
          }}
        >
          Free budget &amp; expense tracker
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#94a3b8",
            marginTop: 16,
            textAlign: "center",
            display: "flex",
          }}
        >
          Collaborative workspaces for families &amp; small teams
        </div>
      </div>
    ),
    { ...size },
  );
}
