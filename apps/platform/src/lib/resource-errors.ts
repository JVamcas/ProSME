export class ResourceNotFoundError extends Error {
  readonly userMessage: string;

  constructor(resourceName = "resource") {
    super(`${resourceName} not found`);
    this.name = "ResourceNotFoundError";
    this.userMessage = `The requested ${resourceName} was not found.`;
  }
}
