import { siteConfig } from "@/lib/site";
import { FAQ_ITEMS } from "@/components/shared/landing/faq-section";

/**
 * JSON-LD structured data for the landing page.
 *
 * Emits `WebSite`, `Organization`, `SoftwareApplication`, and `FAQPage`
 * entities so search engines can associate the brand, product type, free
 * price, security model, and Q&A content with the domain. `FAQPage` items are
 * derived from {@link FAQ_ITEMS}, the same constant rendered visibly by
 * {@link FaqSection}, so the two can never drift apart.
 *
 * @remarks Pure Server Component. React 19 serializes string children of
 * `script` tags verbatim, so `<script>{JSON.stringify(...)}</script>` produces
 * valid JSON-LD without `dangerouslySetInnerHTML` (repo HTML-injection rule).
 * `<` is escaped to keep user-influenced strings from closing the tag early.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json">
      {JSON.stringify(data).replace(/</g, "\\u003c")}
    </script>
  );
}

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  inLanguage: "en",
  publisher: { "@id": ORGANIZATION_ID },
};

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  url: siteConfig.url,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: siteConfig.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Multi-workspace financial tracking",
    "Collaborative budgeting with real-time utilization",
    "Income, expense, and transfer logging",
    "Two-level categories and sub-categories",
    "Analytics dashboards and net-worth trends",
  ],
};

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

/**
 * Landing page structured data.
 *
 * Render once inside the landing page; all four JSON-LD entities are emitted
 * from here so structured data has exactly one home in the codebase.
 */
export function StructuredData() {
  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={website} />
      <JsonLd data={softwareApplication} />
      <JsonLd data={faqPage} />
    </>
  );
}
