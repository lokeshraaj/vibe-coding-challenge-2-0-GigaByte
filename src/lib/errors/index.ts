import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: unknown) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists or state conflict occurred") {
    super(message, 409);
  }
}

export class TenantIsolationError extends AppError {
  constructor(message: string = "Cross-tenant access violation detected") {
    super(message, 403);
  }
}

export class DatabaseConnectionError extends AppError {
  constructor(message: string = "Database service temporarily unavailable", details?: unknown) {
    super(message, 503, details);
  }
}

/**
 * Detects whether an error originates from a database connection or network failure.
 */
export function isDatabaseError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DatabaseConnectionError) return true;

  if (typeof error === "object") {
    const err = error as Record<string, any>;
    const name = err.name || "";
    const msg = typeof err.message === "string" ? err.message : "";
    const code = err.code || "";
    const syscall = err.syscall || "";

    if (
      name === "MongooseServerSelectionError" ||
      name === "MongoServerSelectionError" ||
      name === "MongoNetworkError" ||
      name === "MongoTopologyClosedError" ||
      name === "MongoNotConnectedError" ||
      code === "ECONNREFUSED" ||
      code === "ETIMEOUT" ||
      syscall === "querySrv" ||
      msg.includes("querySrv") ||
      msg.includes("Could not connect to any servers in your MongoDB Atlas cluster") ||
      msg.includes("SSL alert number 80") ||
      msg.includes("tlsv1 alert internal error")
    ) {
      return true;
    }
  }

  return false;
}

export function handleApiError(error: unknown): { status: number; body: { success: false; error: string; details?: unknown } } {
  console.error("[API Error Handler]", error);

  if (error instanceof ZodError) {
    const errorMessages = error.issues.map((issue) => issue.message).join(". ");
    return {
      status: 400,
      body: {
        success: false,
        error: errorMessages,
        details: error.issues,
      },
    };
  }

  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: error.message,
        details: error.details,
      },
    };
  }

  if (isDatabaseError(error)) {
    return {
      status: 503,
      body: {
        success: false,
        error: "Database service temporarily unavailable. Please try again shortly.",
      },
    };
  }

  const message = error instanceof Error ? error.message : "An unexpected server error occurred";
  return {
    status: 500,
    body: {
      success: false,
      error: message,
    },
  };
}
