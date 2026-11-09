"use client";

/**
 * In-app budget threshold alerts, shared by the dashboard and budgets page.
 *
 * Renders nothing when no budget is at or past its threshold, so the panel
 * never becomes decoration. Severity is always stated in text, not only in
 * color, and each row points at the budgets page where the budget can be
 * adjusted.
 */

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { BudgetAlert } from "@/features/budgets/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BUDGET_ALERT_BADGE_VARIANT,
  BUDGET_ALERT_LABEL,
} from "./alert-presentation";

/** Alerts listed inline before deferring the rest to the budgets page. */
const MAX_VISIBLE_ALERTS = 3;

interface BudgetAlertPanelProps {
  alerts: BudgetAlert[];
  className?: string;
}

/** Heading that states both severities when they occur together. */
function headingFor(exceeded: number, warning: number): string {
  if (exceeded > 0 && warning > 0) {
    return `${exceeded} over limit, ${warning} nearing ${
      warning === 1 ? "a limit" : "limits"
    }`;
  }
  if (exceeded > 0) {
    return exceeded === 1
      ? "1 budget is over its limit"
      : `${exceeded} budgets are over their limits`;
  }
  return warning === 1
    ? "1 budget is nearing its limit"
    : `${warning} budgets are nearing their limits`;
}

export function BudgetAlertPanel({
  alerts,
  className,
}: BudgetAlertPanelProps) {
  if (alerts.length === 0) return null;

  const exceeded = alerts.filter((alert) => alert.level === "EXCEEDED").length;
  const warning = alerts.length - exceeded;
  const hasExceeded = exceeded > 0;
  const visible = alerts.slice(0, MAX_VISIBLE_ALERTS);
  const hidden = alerts.length - visible.length;

  return (
    <Card
      className={cn(
        "gap-0 py-0",
        hasExceeded
          ? "border-red-500/30 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5",
        className,
      )}
    >
      <div className="space-y-2.5 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                hasExceeded ? "text-red-600" : "text-amber-600",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {headingFor(exceeded, warning)}
              </p>
              {exceeded > 0 && warning > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Measured against each budget&apos;s current period.
                </p>
              )}
            </div>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-xs"
          >
            <Link href="/budgets">
              View budgets
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <ul className="space-y-1.5">
          {visible.map((alert) => (
            <li
              key={alert.dedupeKey}
              className="flex items-start justify-between gap-3 rounded-md bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {alert.subCategoryName}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(Number(alert.spent))} of{" "}
                  {formatCurrency(Number(alert.limit))} this{" "}
                  {alert.interval === "YEARLY" ? "year" : "month"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    alert.level === "EXCEEDED"
                      ? "text-red-600"
                      : "text-muted-foreground",
                  )}
                >
                  {alert.utilization.toFixed(0)}%
                </span>
                <Badge
                  size="sm"
                  variant={BUDGET_ALERT_BADGE_VARIANT[alert.level]}
                >
                  {BUDGET_ALERT_LABEL[alert.level]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>

        {hidden > 0 && (
          <p className="text-xs text-muted-foreground">
            {hidden} more on the budgets page.
          </p>
        )}
      </div>
    </Card>
  );
}
