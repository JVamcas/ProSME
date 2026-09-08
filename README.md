# ProSME Platform

Phase 0A and 0B demonstrator for the SME Fund applicant and internal review journeys within ProSME, built with Next.js, TypeScript, Tailwind CSS, React Hook Form, Zod, Zustand, TanStack Table, Recharts, Sonner, Lucide React, and accessible UI primitives.

ProSME is the platform identity and SME Fund is a programme within it. The interface follows the supplied ProSME Brand Guide, including the official gold-and-yellow wordmark treatment, colour palette, and local Blanquotey/Bahnschrift typography.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production-mode rehearsal:

```bash
npm run build
npm run start
```

## Recommended demo journey

```text
Home -> Eligibility -> Application -> Confirmation -> Applicant Dashboard
```

On the application page, use **Fill demo data** to populate the form and simulated supporting-document names. The eligibility checker and application are interactive. Submitted application data is kept in browser storage for continuity during the demo.

Continue to the internal experience at `/admin`. The application register supports searching and column sorting. Select a record to open its read-only review summary and workflow position.

## Prototype boundaries

- Authentication is not connected.
- Submissions are not sent to a server or database.
- Selected files are not uploaded; only their names are retained locally.
- Email, SMS, screening, assessment, and approval workflows are simulated.
- Internal assessment and approval actions are disabled; the dashboard and review records are read-only.

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full delivery roadmap.
