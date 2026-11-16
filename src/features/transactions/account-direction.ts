/**
 * Account-direction invariant for a transaction row.
 *
 * A row's `type` determines which account columns may be set:
 * - INCOME   → destination only
 * - EXPENSE  → source only
 * - TRANSFER → both, and they must differ
 *
 * Kept free of Prisma/Next imports so the rule can be evaluated without a
 * database connection; the service maps a failure to a typed domain error.
 * Callers must pass the tuple that will be persisted, not just the patch.
 */

import { TransactionType } from "../../../generated/prisma/enums";

/** Invariant failures, named after the service error codes they map to. */
export type AccountDirectionError =
  | "INVALID_ACCOUNT_DIRECTION"
  | "SOURCE_DESTINATION_SAME";

/**
 * Returns the violated invariant for a `(type, source, destination)` tuple,
 * or `null` when the tuple is coherent.
 */
export function checkAccountDirection(
  type: TransactionType,
  sourceAccountId: string | null | undefined,
  destinationAccountId: string | null | undefined,
): AccountDirectionError | null {
  const source = sourceAccountId ?? null;
  const destination = destinationAccountId ?? null;

  switch (type) {
    case TransactionType.INCOME:
      return destination !== null && source === null
        ? null
        : "INVALID_ACCOUNT_DIRECTION";
    case TransactionType.EXPENSE:
      return source !== null && destination === null
        ? null
        : "INVALID_ACCOUNT_DIRECTION";
    case TransactionType.TRANSFER:
      if (source === null || destination === null) {
        return "INVALID_ACCOUNT_DIRECTION";
      }
      return source === destination ? "SOURCE_DESTINATION_SAME" : null;
  }
}
