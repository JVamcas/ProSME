export type ApplicationStatus = "Submitted" | "Completeness Check" | "Technical Assessment" | "Finance Review" | "More Information" | "Approved" | "Declined";

export type AdminApplication = {
  id: string;
  applicant: string;
  business: string;
  sector: string;
  region: string;
  requested: number;
  submitted: string;
  status: ApplicationStatus;
  ownership: number;
  employees: number;
  jobs: number;
  turnover: string;
  summary: string;
  useOfFunds: string;
  documents: number;
};

export const adminApplications: AdminApplication[] = [
  { id: "SMEF-2026-00017", applicant: "Selma Nghidinwa", business: "Oshana Harvest Foods CC", sector: "Agro-processing", region: "Oshana", requested: 85000, submitted: "2026-09-08", status: "Completeness Check", ownership: 100, employees: 7, jobs: 4, turnover: "N$500,001–N$1,000,000", summary: "Produces shelf-stable mahangu and marula food products for independent retailers in northern Namibia.", useOfFunds: "Food-grade packaging equipment and product certification for national retail distribution.", documents: 8 },
  { id: "SMEF-2026-00016", applicant: "Lukas Amutenya", business: "Etosha Solar Solutions", sector: "Renewable energy", region: "Oshikoto", requested: 100000, submitted: "2026-09-08", status: "Technical Assessment", ownership: 75, employees: 11, jobs: 3, turnover: "Above N$1,000,000", summary: "Designs and installs small-scale solar systems for farms and rural hospitality businesses.", useOfFunds: "Testing equipment, installer certification and expansion of inventory capacity.", documents: 8 },
  { id: "SMEF-2026-00015", applicant: "Ndapewa Shikongo", business: "Kavango Craft Collective", sector: "Creative industries", region: "Kavango East", requested: 62000, submitted: "2026-09-07", status: "More Information", ownership: 100, employees: 5, jobs: 6, turnover: "N$250,001–N$500,000", summary: "Connects rural makers to tourism and online retail markets through a shared production hub.", useOfFunds: "E-commerce setup, quality control tools and market-ready packaging.", documents: 6 },
  { id: "SMEF-2026-00014", applicant: "Paulus Iipinge", business: "Coastline Cold Chain", sector: "Logistics", region: "Erongo", requested: 98000, submitted: "2026-09-07", status: "Finance Review", ownership: 60, employees: 14, jobs: 5, turnover: "Above N$1,000,000", summary: "Provides temperature-controlled transport to fisheries and independent food producers.", useOfFunds: "Retrofit monitoring systems and add energy-efficient refrigeration capacity.", documents: 8 },
  { id: "SMEF-2026-00013", applicant: "Maria Katjivena", business: "Omaheke Leatherworks", sector: "Manufacturing", region: "Omaheke", requested: 74000, submitted: "2026-09-06", status: "Submitted", ownership: 100, employees: 4, jobs: 3, turnover: "Up to N$250,000", summary: "Manufactures small-batch leather accessories using locally sourced materials.", useOfFunds: "Industrial sewing machinery and product development for wholesale orders.", documents: 7 },
  { id: "SMEF-2026-00012", applicant: "Taimi Hamukwaya", business: "Zambezi Eco Trails", sector: "Tourism", region: "Zambezi", requested: 90000, submitted: "2026-09-05", status: "Approved", ownership: 80, employees: 9, jobs: 7, turnover: "N$500,001–N$1,000,000", summary: "Community-led nature and cultural experiences serving domestic and regional travellers.", useOfFunds: "Safety equipment, guide training and a direct booking platform.", documents: 8 },
  { id: "SMEF-2026-00011", applicant: "Johannes Kahuure", business: "Otjo Farm Analytics", sector: "Technology", region: "Otjozondjupa", requested: 68000, submitted: "2026-09-05", status: "Declined", ownership: 51, employees: 3, jobs: 2, turnover: "Up to N$250,000", summary: "Provides livestock record and grazing analytics to commercial and communal farmers.", useOfFunds: "Sensor prototyping and customer onboarding activities.", documents: 5 },
  { id: "SMEF-2026-00010", applicant: "Hilma Nuuyoma", business: "Kunene Botanicals", sector: "Agro-processing", region: "Kunene", requested: 80000, submitted: "2026-09-04", status: "Technical Assessment", ownership: 100, employees: 6, jobs: 4, turnover: "N$250,001–N$500,000", summary: "Develops natural personal-care products from sustainably sourced indigenous plants.", useOfFunds: "Compliance testing, batch equipment and distributor-ready packaging.", documents: 8 },
];

export const applicationTrend = [
  { day: "02 Sep", applications: 12 }, { day: "03 Sep", applications: 18 }, { day: "04 Sep", applications: 15 },
  { day: "05 Sep", applications: 27 }, { day: "06 Sep", applications: 21 }, { day: "07 Sep", applications: 34 }, { day: "08 Sep", applications: 41 },
];

export const sectorSummary = [
  { name: "Agro-processing", value: 32, fill: "#16a34a" },
  { name: "Technology", value: 24, fill: "#6baed6" },
  { name: "Tourism", value: 18, fill: "#ffca45" },
  { name: "Manufacturing", value: 15, fill: "#ff6f00" },
  { name: "Other", value: 11, fill: "#c9a24d" },
];

export const regionSummary = [
  { region: "Khomas", applications: 29 }, { region: "Erongo", applications: 21 },
  { region: "Oshana", applications: 18 }, { region: "Otjozondjupa", applications: 14 },
  { region: "Other regions", applications: 46 },
];

export function getAdminApplication(id: string) {
  return adminApplications.find(application => application.id === id);
}
