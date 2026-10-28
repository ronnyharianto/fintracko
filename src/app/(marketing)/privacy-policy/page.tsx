import type { Metadata } from "next";

/**
 * SEO metadata for the Privacy Policy page.
 */
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Fintracko Privacy Policy: learn how we collect, use, and protect your personal and financial data.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy — Fintracko",
    description:
      "Learn how Fintracko collects, uses, and protects your personal and financial data.",
    siteName: "Fintracko",
    type: "website",
    url: "/privacy-policy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Privacy Policy static page.
 *
 * Accessible at `/privacy-policy`. Provides transparent disclosure
 * of data handling practices for a financial SaaS application:
 * data collection, infrastructure and database providers, OAuth identity
 * processing, Imgur attachment hosting, cookie usage, user rights, and
 * contact information.
 *
 * Rendered inside the `(marketing)` route group layout which
 * provides the public NavBar + Footer shell.
 *
 * @remarks Pure Server Component. The legal text is rendered as
 * standard React children — Next.js auto-escapes all text,
 * eliminating XSS risk without additional sanitization.
 */
export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: October 2026
      </p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-foreground">
        {/* Introduction */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
          <p>
            Fintracko (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;)
            is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our financial tracking application (the
            &ldquo;Service&rdquo;). By accessing or using the Service, you agree
            to the terms of this Privacy Policy.
          </p>
        </section>

        {/* Information We Collect */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            2. Information We Collect
          </h2>
          <h3 className="mb-2 mt-4 text-lg font-medium">
            2.1 Authentication Data
          </h3>
          <p>
            When you sign in via Google or GitHub OAuth, we receive your name,
            email address, and profile image from the OAuth provider. We only
            process OAuth payloads where the provider has verified your email
            address. In production, we do not store or manage traditional
            username/password credentials.
          </p>
          <h3 className="mb-2 mt-4 text-lg font-medium">
            2.2 Profile & Onboarding Data
          </h3>
          <p>
            During onboarding, you provide your name and currency preference.
            You may also add a phone number, company name, biography, date of
            birth, or gender through profile settings. This information is
            stored in your Profile record.
          </p>
          <h3 className="mb-2 mt-4 text-lg font-medium">2.3 Financial Data</h3>
          <p>
            As you use the Service, you input financial data including account
            names, transaction amounts, categories, budgets, payee/payer names,
            tags, descriptions, and optional receipt image attachments.
            Financial amounts are stored as decimal values with four decimal
            places.
          </p>
          <h3 className="mb-2 mt-4 text-lg font-medium">
            2.4 Usage & Technical Data
          </h3>
          <p>
            When you access the Service, our hosting and analytics providers
            may process technical information such as IP address, browser or
            device information, and request or page-view metadata as part of
            operating and measuring the Service. Their handling of this
            information is subject to their own privacy policies.
          </p>
        </section>

        {/* How We Use Your Information */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            3. How We Use Your Information
          </h2>
          <p>We use the collected information to:</p>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>Authenticate your identity and maintain your session.</li>
            <li>
              Provide, maintain, and improve the core financial tracking
              functionality.
            </li>
            <li>
              Enforce workspace isolation and multi-tenancy access control.
            </li>
            <li>Operate and troubleshoot the Service.</li>
            <li>
              Comply with legal obligations and enforce our Terms of Service.
            </li>
          </ul>
        </section>

        {/* Data Storage & Third-Party Services */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            4. Data Storage & Third-Party Services
          </h2>
          <h3 className="mb-2 mt-4 text-lg font-medium">
            4.1 Application Hosting (Vercel)
          </h3>
          <p>
            The production Service is hosted on Vercel. Requests to the Service, including
            information you submit, are processed by infrastructure used to run
            the application. Vercel may process technical and diagnostic data,
            such as IP address and request metadata, to deliver, secure, and
            maintain the Service.
          </p>
          <h3 className="mb-2 mt-4 text-lg font-medium">
            4.2 Database Hosting (Neon)
          </h3>
          <p>
            The production Service stores persistent data, including profile,
            authentication, and financial data, in a PostgreSQL database
            hosted on Neon. The application uses workspace-level access checks
            to control access to workspace data.
          </p>
          <h3 className="mb-2 mt-4 text-lg font-medium">
            4.3 Image Attachments (Imgur)
          </h3>
          <p>
            When you attach a receipt image to a transaction, the image file is
            uploaded to Imgur&apos;s public API. Only the resulting public URL
            string is stored in our database. Imgur&apos;s privacy policy
            governs the handling of uploaded images on their platform.
          </p>
          <h3 className="mb-2 mt-4 text-lg font-medium">
            4.4 Authentication Providers (Google, GitHub)
          </h3>
          <p>
            Authentication is delegated to Google and GitHub OAuth. We do not
            receive or store your provider account passwords. Please refer to
            Google&apos;s and GitHub&apos;s respective privacy policies for
            details on how they handle your authentication data.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">5. Cookies & Tracking</h2>
          <p>
            Authentication uses cookies to maintain your session; cookie
            attributes may vary by environment. The site includes Vercel Web
            Analytics to measure page-view activity. For details about
            information processed by Vercel, see its current privacy
            documentation.
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">6. Data Retention</h2>
          <p>
            We retain account data while your account is active. If you delete
            your account, the application deletes your account records and
            workspaces you own, including their associated records, from its
            database. Your membership is removed from workspaces owned by
            others, but those workspaces remain. Receipt images uploaded to
            Imgur are not deleted by this database operation; their handling
            and retention are governed by Imgur&apos;s policies. Third-party
            providers may also retain copies under their own retention
            practices.
          </p>
        </section>

        {/* Your Rights */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>
              View and update the profile information available in account
              settings.
            </li>
            <li>
              Delete your account through account settings.
            </li>
            <li>
              Request access to, correction of, or a copy of personal data,
              where applicable under local law. The Service does not currently
              provide a self-service data export.
            </li>
          </ul>
        </section>

        {/* Security */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">8. Data Security</h2>
          <p>
            The application uses controls such as session validation for
            protected API requests, workspace-level access checks, input
            validation and sanitization, and database transactions for related
            financial changes. These controls are intended to reduce security
            and data-integrity risks, but no method of electronic storage or
            transmission is completely secure.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Material
            changes will be communicated via a notice on our landing page or via
            the email address associated with your account. The &ldquo;Last
            updated&rdquo; date at the top of this page reflects the most recent
            revision.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">10. Contact Us</h2>
          <p>
            A dedicated support email address has not yet been published. This
            section will be updated with a contact channel once one becomes
            available.
          </p>
        </section>
      </div>
    </article>
  );
}
