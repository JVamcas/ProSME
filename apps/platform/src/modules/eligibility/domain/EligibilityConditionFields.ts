import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";

export const eligibilityConditionFields = [
  {
    key: "application.requested_amount",
    label: "Requested amount",
    type: "NUMBER",
  },
  {
    key: "application.annual_turnover",
    label: "Annual turnover",
    type: "NUMBER",
  },
  {
    key: "application.business.employee_count",
    label: "Employee count",
    type: "NUMBER",
  },
  {
    key: "application.business.ownership_percentage",
    label: "Namibian ownership percentage",
    type: "NUMBER",
  },
  {
    key: "application.business.operating_months",
    label: "Months in operation",
    type: "NUMBER",
  },
  {
    key: "application.business.registered",
    label: "Business is registered",
    type: "BOOLEAN",
  },
  {
    key: "application.business.statutory_good_standing",
    label: "Statutory good standing",
    type: "BOOLEAN",
  },
  {
    key: "application.business.bank_account_active",
    label: "Active business bank account",
    type: "BOOLEAN",
  },
  {
    key: "fundingCall.maximum_grant_amount",
    label: "Funding Call maximum grant amount",
    type: "NUMBER",
  },
] as const satisfies readonly ConditionFieldDefinition[];
