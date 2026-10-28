import { cn } from "@/lib/utils";

/**
 * Landing page FAQ content.
 *
 * Q&As target the secondary long-tail keywords (free, collaborative, shared
 * finances) and are rendered as visible content below.
 */
export const FAQ_ITEMS = [
  {
    question: "Is Fintracko free to use?",
    answer:
      "Yes — Fintracko is currently free to use, and no credit card is required to sign up.",
  },
  {
    question: "Can I share a budget with my family?",
    answer:
      "Yes. Create a family workspace, add financial accounts and category budgets, then invite family members by email. Workspace members can view shared accounts and budgets.",
  },
  {
    question: "Can my small team track expenses together?",
    answer:
      "Yes. Create a small-business workspace and invite collaborators by email to share access to its accounts, transactions, and budgets. You can also create personal or family workspaces.",
  },
  {
    question: "Does Fintracko support multiple currencies?",
    answer:
      "Each workspace uses one currency, selected when it is created. You can create separate workspaces to track finances in different currencies.",
  },
  {
    question: "How is my financial data secured?",
    answer:
      "In production, sign-in uses Google or GitHub. Protected API routes use session validation and workspace access checks. See the Privacy Policy for more about data handling and security practices.",
  },
  {
    question: "Do I need a credit card to sign up?",
    answer:
      "No. Sign-up only requires a Google or GitHub account — no payment details are needed.",
  },
] as const;

/**
 * Landing page FAQ section.
 *
 * Keyword-bearing Q&As rendered as native `<details>/<summary>` accordions
 * with zero JavaScript and no new dependency.
 */export function FaqSection({ className }: { className?: string }) {
  return (
    <section
      id="faq"
      className={cn(
        "relative overflow-hidden bg-linear-to-b from-background via-primary/5 to-background py-10 lg:py-20",
        className,
      )}
    >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              FAQ
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Frequently Asked{" "}
              <span className="bg-linear-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mt-4">
              Answers about Fintracko&apos;s budgeting and shared-workspace
              features.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 open:border-primary/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-lg font-semibold text-card-foreground [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-2xl leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                  {item.question === "How is my financial data secured?" && (
                    <>
                      {" "}
                      <a
                        href="/privacy-policy"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Read the Privacy Policy
                      </a>
                      .
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
  );
}
