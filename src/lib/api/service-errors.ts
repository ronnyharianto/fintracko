import type { NextResponse } from "next/server";
import {
  failure,
  type ApiErrorCode,
  type FailureEnvelope,
} from "@/lib/api/envelope";

export interface ServiceErrorMapping {
  code: ApiErrorCode;
  message: string;
}

export function serviceErrorFailure<
  Code extends string,
  ErrorType extends { code: Code },
>(
  error: unknown,
  isServiceError: (error: unknown) => error is ErrorType,
  messages: Partial<Record<Code, ServiceErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  if (!isServiceError(error)) {
    return null;
  }

  const mapped = messages[error.code];
  return mapped ? failure(mapped.code, mapped.message) : null;
}

export function handleServiceErrors<
  Code extends string,
  ErrorType extends { code: Code },
  Args extends unknown[],
>(
  isServiceError: (error: unknown) => error is ErrorType,
  messages: Partial<Record<Code, ServiceErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const mapped = serviceErrorFailure(error, isServiceError, messages);
      return mapped ?? failure("INTERNAL_SERVER_ERROR", fallbackMessage);
    }
  };
}
