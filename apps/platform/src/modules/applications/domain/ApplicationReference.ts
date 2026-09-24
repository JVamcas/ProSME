const fundingCallReferencePattern = /^[A-Z0-9][A-Z0-9_-]{1,79}$/;

export class ApplicationReferenceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationReferenceConfigurationError";
  }
}

export function formatApplicationReference(input: {
  fundingCallReference: string;
  sequenceValue: bigint;
  submittedAt: Date;
}) {
  if (!fundingCallReferencePattern.test(input.fundingCallReference)) {
    throw new ApplicationReferenceConfigurationError(
      "The Funding Call application reference configuration is invalid.",
    );
  }
  if (input.sequenceValue < BigInt(1)) {
    throw new ApplicationReferenceConfigurationError(
      "The application reference sequence is invalid.",
    );
  }
  const year = input.submittedAt.getUTCFullYear();
  if (!Number.isSafeInteger(year) || year < 2000 || year > 9999) {
    throw new ApplicationReferenceConfigurationError(
      "The application reference year is invalid.",
    );
  }
  const sequence = input.sequenceValue.toString().padStart(6, "0");
  return `${input.fundingCallReference}-${year}-${sequence}`;
}
