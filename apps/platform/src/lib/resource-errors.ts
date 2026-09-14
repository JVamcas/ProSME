export class ResourceNotFoundError extends Error {
  readonly userMessage: string;

  constructor(resourceName = "resource") {
    super(`${resourceName} not found`);
    this.name = "ResourceNotFoundError";
    this.userMessage = `The requested ${resourceName} was not found.`;
  }
}

export class ResourceConflictError extends Error {
  readonly userMessage: string;

  constructor(message: string) {
    super(message);
    this.name = "ResourceConflictError";
    this.userMessage = message;
  }
}

export class RequestValidationError extends Error {
  readonly userMessage: string;

  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
    this.userMessage = message;
  }
}
