import { seedStandardEligibilityBaseline } from "../../apps/platform/src/modules/eligibility/application/standard/ServerStandardEligibilitySeedService";

const references = (process.env.SME_FUND_ELIGIBILITY_FUNDING_CALL_REFERENCES ?? "")
  .split(",")
  .map((reference) => reference.trim())
  .filter(Boolean);
const result = await seedStandardEligibilityBaseline({
  approvedAt: new Date("2026-09-22T00:00:00.000Z"),
  approvedBy: "Business approval confirmed by repository owner",
  fundingCallReferences: references,
});
console.info(
  result.created
    ? `Created standard eligibility draft ${result.versionId}.`
    : result.synchronized
      ? `Synchronized standard eligibility draft ${result.versionId}.`
      : `Skipped existing standard eligibility baseline ${result.versionId}.`,
);
console.info(
  `Funding Calls bound: ${result.boundFundingCallReferences.join(", ") || "none"}.`,
);
console.info(`Configuration issues: ${result.issueMessages.length}.`);
for (const message of result.issueMessages) console.info(`- ${message}`);
process.exit(0);
