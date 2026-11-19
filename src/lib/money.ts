/**
 * Shared decimal-string contract for money fields.
 *
 * Money crosses the API as a decimal string so the value the client sent is
 * exactly the value persisted: accounts and transactions store `Decimal(18,4)`,
 * whose full width is 14 integer digits plus 4 decimal places. Parsing to a
 * JavaScript float first loses precision and lets out-of-range values reach
 * Prisma as a server error instead of a validation failure.
 */
import { z } from "zod";

/** Maximum integer digits a `Decimal(18,4)` column can hold. */
export const MONEY_MAX_INTEGER_DIGITS = 14;

/** Maximum decimal places a `Decimal(18,4)` column can hold. */
export const MONEY_MAX_DECIMAL_PLACES = 4;

/**
 * Bounds-only money shape: optional leading minus, bounded integer digits and
 * decimal places. Domains layer their own rules on top (transactions forbid
 * zero; account opening balances may be zero or negative).
 */
export const MONEY_PATTERN = new RegExp(
  `^-?\\d{1,${MONEY_MAX_INTEGER_DIGITS}}(?:\\.\\d{1,${MONEY_MAX_DECIMAL_PLACES}})?$`,
);

export const MoneyAmountSchema = z
  .string()
  .regex(
    MONEY_PATTERN,
    "Amount must fit within 14 digits and 4 decimal places",
  );
