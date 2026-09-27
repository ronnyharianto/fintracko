import type { Metadata } from "next";
import { HeroSection } from "@/components/shared/landing/hero-section";
import { FeatureGrid } from "@/components/shared/landing/feature-grid";
import { HowItWorks } from "@/components/shared/landing/how-it-works";
import { FaqSection } from "@/components/shared/landing/faq-section";
import { CtaSection } from "@/components/shared/landing/cta-section";
import { StructuredData } from "@/components/shared/landing/structured-data";

/**
 * Landing page SEO metadata.
 *
 * Crafted for search engine visibility per PRD_MVP1.md §3.1:
 * "Public marketing page optimized for SEO to drive user acquisition."
 * Keywords target the winnable long-tail (free/collaborative angle) rather
 * than head terms dominated by incumbent budgeting apps.
 */
export const metadata: Metadata = {
  title: "Fintracko — Free Budget & Expense Tracker for Teams & Families",
  description:
    "Track income, expenses, and budgets together — Fintracko is a free collaborative budget tracker with shared workspaces for families and small teams.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Fintracko — Free Budget & Expense Tracker",
    description:
      "Track income, expenses, and budgets across multiple workspaces. Collaborative and secure — free to start.",
    siteName: "Fintracko",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fintracko — Free Budget & Expense Tracker",
    description:
      "Collaborative budget tracker with shared workspaces for families and small teams.",
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
      <StructuredData />
      <HeroSection />
      <FeatureGrid id="features" />
      <HowItWorks id="how-it-works" />
      <FaqSection />
      <CtaSection />
    </>
  );
}
