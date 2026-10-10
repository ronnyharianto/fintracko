import type { Metadata } from "next";

/**
 * SEO metadata for the Terms of Service page.
 */
export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Fintracko Terms of Service: read the terms and conditions governing your use of the Fintracko financial tracking platform.",
  alternates: {
    canonical: "/terms-of-service",
  },
  openGraph: {
    title: "Terms of Service — Fintracko",
    description:
      "Read the terms and conditions governing your use of the Fintracko financial tracking platform.",
    siteName: "Fintracko",
    type: "website",
    url: "/terms-of-service",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Terms of Service static page.
 *
 * Accessible at `/terms-of-service`. Outlines the legal agreement
 * between Fintracko and its users: acceptable use of the platform,
 * account responsibilities, intellectual property, service
 * availability disclaimers, limitation of liability, and termination
 * conditions.
 *
 * Rendered inside the `(marketing)` route group layout which
 * provides the public NavBar + Footer shell.
 *
 * @remarks Pure Server Component. All text is rendered as standard
 * React children — Next.js auto-escapes text, eliminating XSS risk.
 */
export default function TermsOfServicePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: October 2026
      </p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-foreground">
        {/* Acceptance */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Fintracko (&ldquo;the Service&rdquo;), you
            agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).
            If you do not agree to these Terms, you may not access or use the
            Service. These Terms constitute a legally binding agreement between
            you and Fintracko.
          </p>
        </section>

        {/* Eligibility */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">2. Eligibility</h2>
          <p>
            You must be at least 13 years of age to use the Service. By creating
            an account, you represent and warrant that you meet this age
            requirement and that the information you provide during registration
            and onboarding is accurate and complete.
          </p>
        </section>

        {/* Accounts */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            3. Accounts & Authentication
          </h2>
          <p>
            In production, you may only access the Service via OAuth
            authentication through Google or GitHub. You are responsible for maintaining the security
            of your third-party provider accounts. You must not share your
            session credentials or attempt to access workspaces to which you
            have not been explicitly invited. You are solely responsible for all
            activity conducted through your account.
          </p>
        </section>

        {/* Acceptable Use */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            4. Acceptable Use Policy
          </h2>
          <p>You agree not to:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Use the Service for any unlawful purpose or in violation of any
              applicable laws or regulations.
            </li>
            <li>
              Upload, post, or transmit any content that is fraudulent,
              misleading, defamatory, obscene, or infringes upon the
              intellectual property rights of others.
            </li>
            <li>
              Attempt to gain unauthorized access to workspaces, accounts, or
              data belonging to other users (including probing for Insecure
              Direct Object Reference vulnerabilities).
            </li>
            <li>
              Interfere with or disrupt the integrity, performance, or security
              of the Service, its servers, or its underlying infrastructure.
            </li>
            <li>
              Use automated means (bots, scrapers, crawlers) to access or
              extract data from the Service without prior written permission.
            </li>
            <li>
              Upload receipt attachments exceeding 2 MB in size or containing
              malicious content.
            </li>
          </ul>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            5. Intellectual Property
          </h2>
          <p>
            The Service and its original content, features, and functionality —
            including the Fintracko name, logo, design system, and source code —
            are and will remain the exclusive property of Fintracko. You retain
            ownership of the financial data you input into the Service. By using
            the Service, you grant us a limited license to store and process
            your data solely for the purpose of providing the Service to you.
          </p>
        </section>

        {/* Third-Party Services */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            6. Third-Party Services
          </h2>
          <p>
            The Service relies on third-party infrastructure including Vercel
            (application hosting and cookie-less Web Analytics), Neon (database
            hosting), Imgur (image attachment hosting), Google (OAuth provider),
            and GitHub (OAuth provider). We are not responsible for the availability,
            accuracy, or practices of these third-party services. Your use of
            these services through Fintracko is also governed by their
            respective terms and policies.
          </p>
        </section>

        {/* Disclaimer */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            7. Disclaimer of Warranties
          </h2>
          <p>
            The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS
            AVAILABLE&rdquo; basis, without warranties of any kind, either
            express or implied. Fintracko does not warrant that the Service will
            be uninterrupted, error-free, secure, or free from viruses or other
            harmful components. Financial calculations and reports generated by
            the Service are provided for informational purposes only and do not
            constitute professional financial advice.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            8. Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by applicable law, Fintracko and its
            operators shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages — including loss of profits,
            data, use, or goodwill — arising out of or related to your use of or
            inability to use the Service, whether based on warranty, contract,
            tort (including negligence), or any other legal theory, even if
            advised of the possibility of such damages. In jurisdictions that do
            not allow the exclusion or limitation of liability for consequential
            or incidental damages, our liability is limited to the maximum
            extent permitted by law.
          </p>
        </section>

        {/* Termination */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">9. Termination</h2>
          <p>
            You may terminate your account at any time through the profile
            management interface. Account deletion is irreversible and will
            permanently remove all associated data via cascade deletion. We
            reserve the right to suspend or terminate your access to the Service
            at our sole discretion, without prior notice, for conduct that we
            believe violates these Terms or is otherwise harmful to other users,
            third parties, or the Service itself.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            10. Changes to These Terms
          </h2>
          <p>
            We may modify these Terms at any time. Material changes will be
            communicated via a notice on our landing page or via the email
            address associated with your account. Your continued use of the
            Service after the effective date of any revised Terms constitutes
            your acceptance of the changes.
          </p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the Republic of Indonesia, without regard to its
            conflict of law principles. Any disputes arising under these Terms
            shall be subject to the exclusive jurisdiction of the courts located
            in Jakarta, Indonesia.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">12. Contact</h2>
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
