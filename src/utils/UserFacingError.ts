/** A deliberately safe message that an interaction boundary may show to its user. */
export class UserFacingError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
