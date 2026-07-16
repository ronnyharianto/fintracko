import { cn } from "@/lib/utils";
import {
  UserPlus,
  FolderOpen,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const STEPS: Step[] = [
  {
    number: 1,
    icon: UserPlus,
    title: "Sign Up & Onboard",
    description:
      "Create your account in seconds using Google or GitHub. Complete a quick one-time profile setup and choose your first workspace template.",
  },
  {
    number: 2,
    icon: FolderOpen,
    title: "Configure Your Workspace",
    description:
      "Add financial accounts (bank, cash, wallet), set up categories, and invite collaborators. Your workspace is ready in minutes.",
  },
  {
    number: 3,
    icon: TrendingUp,
    title: "Track, Budget & Grow",
    description:
      "Log transactions daily, monitor budget utilization, and review analytics dashboards to make informed financial decisions.",
  },
];

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Landing page how-it-works — color-enhanced timeline.
 *
 * Section uses a teal-tinted gradient backdrop with an upper accent.
 * Steps have gradient number badges (primary → emerald) and a
 * connecting gradient line between them.
 */
export function HowItWorks({
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
        "relative overflow-hidden bg-linear-to-b from-primary/5 via-background to-emerald-500/5 py-20 lg:py-28",
        className,
      )}
    >
      {/* Decorative gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full bg-linear-to-tr from-emerald-500/10 to-transparent blur-3xl" />
        <div className="absolute right-0 top-0 h-[300px] w-[400px] rounded-full bg-linear-to-bl from-primary/10 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 text-center">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Get Started in{" "}
            <span className="bg-linear-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              Three Simple Steps
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            No complicated setup. No manual data entry marathons. Just a clean
            workflow designed for real people.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-12 mx-auto hidden h-1 max-w-5xl rounded-full bg-linear-to-r from-primary/40 via-emerald-500/40 to-primary/40 md:block"
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Number badge */}
                  <div className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-primary to-emerald-500 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-background">
                    {step.number}
                  </div>
                  {/* Icon */}
                  <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-primary shadow-md shadow-primary/10 ring-1 ring-primary/15">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  {/* Title */}
                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  {/* Description */}
                  <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
