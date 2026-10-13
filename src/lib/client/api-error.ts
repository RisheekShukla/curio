/** Error carrying a user-safe message returned by Curio's API routes. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const SAFE_ERROR_NAMES = new Set(["ApiError", "AppError", "AIUnavailableError"]);

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof Error && (SAFE_ERROR_NAMES.has(err.name) || err.name === "ValidationError")) return err.message;
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You appear to be offline.";
  return fallback;
}
