import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Script from "next/script";
import { SessionProvider } from "@/components/shared/auth/session-provider";

/**
 * Pre-hydration theme script — runs synchronously before React hydrates to
 * avoid a flash of the wrong theme. It honours the user's persisted choice in
 * `localStorage.theme`; otherwise it defaults to the dark theme (the app's
 * default). The script applies/removes the `.dark` class on <html>, which is
 * what Tailwind's `dark:` variant and the design tokens in `globals.css`
 * react to.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fintracko — Smart Financial Tracker",
  description:
    "A modern SaaS application for tracking income, expenses, budgets, and financial goals across multiple workspaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full bg-background text-foreground antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init-script" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
      </body>
    </html>
  );
}
