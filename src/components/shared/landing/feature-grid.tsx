import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PiggyBank,
  BarChart3,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: LayoutDashboard,
    title: "Multi-Workspace Management",
    description:
      "Separate personal, family, and business finances into isolated workspaces — each with its own accounts, categories, and collaborators.",
  },
  {
    icon: PiggyBank,
    title: "Precision Budgeting",
    description:
      "Set monthly or yearly spending limits on any sub-category with real-time utilization tracking.",
  },
  {
    icon: BarChart3,
    title: "Insightful Analytics",
    description:
      "Visualize expense breakdowns, rolling net-worth trends, and budget exhaustion alerts.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    description:
      "OAuth-only authentication, session validation on every request, workspace isolation, and input sanitization against XSS.",
  },
];

/**
 * Landing page feature grid — 2-column card layout.
 *
 * Section uses a subtle teal-tinted gradient backdrop. Each card has a
 * teal/emerald gradient hover glow and a gradient-filled icon badge.
 */
export function FeatureGrid({
  id,
  className,
}: {
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative overflow-hidden bg-linear-to-b from-background via-primary/5 to-background py-10 lg:py-20",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Features
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything You Need to Track{" "}
            <span className="bg-linear-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              Shared Expenses &amp; Budgets
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mt-4">
            From daily transaction logging to long-term budget planning,
            Fintracko provides a complete toolkit for financial clarity.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 lg:p-8",
                )}
              >
                {/* Gradient glow on hover */}
                <div
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-linear-to-br from-primary/0 to-emerald-500/0 blur-2xl transition-all duration-500 group-hover:from-primary/15 group-hover:to-emerald-500/15"
                />
                <div className="relative flex flex-col gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary/20 transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-semibold text-card-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
