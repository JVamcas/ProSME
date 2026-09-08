# SME Fund Platform

Phase 0A demonstrator for the SME Fund applicant journey, built with Next.js, TypeScript, Tailwind CSS, React Hook Form, Zod, Zustand, Sonner, Lucide React, and accessible UI primitives.

The interface uses the supplied SME Fund vector mark and ProSME brand guide, including its colour palette and local Blanquotey/Bahnschrift typography.

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

## Prototype boundaries

- Authentication is not connected.
- Submissions are not sent to a server or database.
- Selected files are not uploaded; only their names are retained locally.
- Email, SMS, screening, assessment, and approval workflows are simulated.
- The internal administrative dashboard is a later phase.

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full delivery roadmap.
