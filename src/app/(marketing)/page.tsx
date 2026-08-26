import type { Metadata } from "next";
import { HeroSection } from "@/components/shared/landing/hero-section";
import { FeatureGrid } from "@/components/shared/landing/feature-grid";
import { HowItWorks } from "@/components/shared/landing/how-it-works";
import { CtaSection } from "@/components/shared/landing/cta-section";

/**
 * Landing page SEO metadata.
 *
 * Crafted for search engine visibility per PRD_MVP1.md §3.1:
 * "Public marketing page optimized for SEO to drive user acquisition."
 */
export const metadata: Metadata = {
  title: "Fintracko — Smart Financial Tracker for Individuals & Teams",
  description:
    "Track income, expenses, and budgets across multiple workspaces with Fintracko. Collaborative financial SaaS with OAuth security, precision budgeting, and insightful analytics — completely free.",
  openGraph: {
    title: "Fintracko — Smart Financial Tracker",
    description:
      "Track income, expenses, and budgets across multiple workspaces. Collaborative, secure, and free.",
    siteName: "Fintracko",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Public marketing landing page — the root route (`/`).
 *
 * Composed of section components imported from
 * `src/components/shared/landing/`. NavBar and Footer are provided
 * by the `(marketing)` layout — this page only renders the content
 * sections.
 *
 * Sections (in order):
 * 1. HeroSection   – headline, subtitle, dual CTAs, decorative blurs
 * 2. FeatureGrid   – 6-card grid showcasing product capabilities
 * 3. HowItWorks    – 3-step onboarding preview
 * 4. CtaSection    – bottom teal banner urging sign-up
 *
 * @remarks This page replaces the default Next.js boilerplate
 * (previously Next.js logos, Vercel links) in compliance with
 * TASK_ROADMAP.md Task 2.1.
 */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeatureGrid id="features" />
      <HowItWorks id="how-it-works" />
      <CtaSection />
    </>
  );
}
