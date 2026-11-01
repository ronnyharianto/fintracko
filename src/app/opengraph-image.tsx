import { ImageResponse } from "next/og";
import { accountsScreenshotDataUri } from "./opengraph-image-data";

/**
 * Site-wide OpenGraph image (`/opengraph-image`).
 *
 * Generated at build time with `next/og` so the layout and brand stay in code.
 * 1200x630 is the canonical social-card size. It follows the split layout used
 * by Play, Pass & Go: a text column (eyebrow, headline, description, feature
 * pills and a URL chip) on the left, and a real dashboard screenshot bleeding
 * off the right edge behind a soft left-edge shadow on the right.
 *
 * Colors are fixed literals (the generated route cannot consume Tailwind design
 * tokens) and mirror the brand: dark surface `#0f172a`, teal `#2dd4bf` /
 * `#14b8a6`, emerald dot `#22c55e`.
 */
export const alt = "Fintracko — budget and expense tracker for shared finances";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0f172a";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: BG,
          backgroundImage:
            "radial-gradient(circle at 8% 20%, rgba(20,184,166,0.22), transparent 42%), radial-gradient(circle at 0% 100%, rgba(0,184,124,0.16), transparent 40%)",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: brand + copy */}
        <div
          style={{
            width: 540,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 56,
            paddingRight: 40,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#99f6e4",
              marginBottom: 22,
              display: "flex",
            }}
          >
            Multi-tenant finance tracker
          </div>

          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.02,
              color: "#2dd4bf",
              marginBottom: 24,
              display: "flex",
            }}
          >
            Fintracko
          </div>

          <div
            style={{
              fontSize: 27,
              fontWeight: 500,
              lineHeight: 1.32,
              color: "#cbd5e1",
              marginBottom: 30,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>Collaborative budget &amp; expense tracker —</div>
            <div>workspaces, multi-currency accounts,</div>
            <div>recurring budgets and analytics.</div>
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 30,
            }}
          >
            {["Workspaces", "Budgets", "Analytics"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "1px solid #334155",
                  backgroundColor: "rgba(15,23,42,0.6)",
                  color: "#e2e8f0",
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* URL chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid #334155",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: "#22c55e",
                display: "flex",
              }}
            />
            <div style={{ fontSize: 22, color: "#e2e8f0", display: "flex" }}>
              fintracko.vercel.app
            </div>
          </div>
        </div>

        {/* Right: dashboard screenshot with a soft left-edge shadow */}
        <div
          style={{
            flex: 1,
            display: "flex",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <img
            src={accountsScreenshotDataUri}
            alt=""
            width={660}
            height={630}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "left top",
              display: "flex",
            }}
          />
          {/* Left-edge shadow so the screenshot blends into the background */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 180,
              height: "100%",
              backgroundImage: `linear-gradient(to right, ${BG} 0%, rgba(15,23,42,0.0) 100%)`,
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
