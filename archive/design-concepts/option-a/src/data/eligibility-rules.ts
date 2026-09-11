export type EligibilityRule = {
  id: string;
  question: string;
  help: string;
  hardStop: boolean;
};

export const eligibilityRules: EligibilityRule[] = [
  { id: "ownership", question: "Is your business at least 51% Namibian-owned and controlled?", help: "Ownership evidence will be verified during screening.", hardStop: true },
  { id: "database", question: "Is your business registered on the NIPDB MSME database?", help: "Registration may be completed before a final funding decision.", hardStop: false },
  { id: "statutory", question: "Is the business registered with all relevant statutory and sectoral institutions?", help: "This generally includes BIPA, NAMRA, Social Security and any sector regulator.", hardStop: false },
  { id: "namra", question: "Is the business in good standing with NAMRA?", help: "A valid Good Standing Certificate will be requested.", hardStop: false },
  { id: "ssc", question: "Is the business in good standing with the Social Security Commission?", help: "A valid Good Standing Certificate will be requested.", hardStop: false },
  { id: "msme", question: "Does the business have valid MSME status or certification?", help: "Your valid MSME certificate will form part of the application.", hardStop: false },
  { id: "bank", question: "Does the business have a functional business bank account?", help: "You will need a bank confirmation letter or recent statement.", hardStop: false },
  { id: "history", question: "Has the business been operating for at least one year?", help: "The current programme targets existing enterprises with an operating track record.", hardStop: true },
  { id: "traction", question: "Can you demonstrate a feasible business model with traction and growth potential?", help: "Examples include customers, recurring revenue, contracts or measurable demand.", hardStop: true },
  { id: "growth", question: "Is the business ready for market expansion, export or investment opportunities?", help: "Your pitch should explain the opportunity and how funding enables it.", hardStop: true },
  { id: "clearance", question: "Can you provide a police clearance certificate or proof of application?", help: "A receipt showing that you have applied is acceptable at application stage.", hardStop: false },
];
