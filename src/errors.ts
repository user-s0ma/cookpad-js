export class CookpadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CookpadError";
  }
}

export class AuthenticationError extends CookpadError {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends CookpadError {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends CookpadError {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class APIError extends CookpadError {
  statusCode: number;

  constructor(message: string, statusCode = 0) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
  }
}
