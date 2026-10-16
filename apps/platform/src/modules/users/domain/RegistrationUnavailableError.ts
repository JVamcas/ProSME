export class RegistrationUnavailableError extends Error {
  constructor() {
    super("Account creation is currently unavailable.");
    this.name = "RegistrationUnavailableError";
  }
}
