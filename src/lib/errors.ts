/** Errors whose message is safe to show to end users. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(what = "Resource") {
    super(404, `${what} not found.`);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.") {
    super(400, message);
  }
}
