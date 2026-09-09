# ProSME Mockups

Three independently deployable UI options for the SME Fund applicant and internal review journeys. The repository is an npm workspace; each option is a complete Next.js application and can be connected to its own Vercel project.

```text
apps/
├── option-a/
├── option-b/
└── option-c/
```

## Add mockup references

Place each option's reference images or exported UI files in its matching folder:

```text
apps/option-a/public/mockups/
apps/option-b/public/mockups/
apps/option-c/public/mockups/
```

## Run locally

Install dependencies once from the repository root:

```bash
npm install
```

Then start the required option:

```bash
npm run dev:option-a
npm run dev:option-b
npm run dev:option-c
```

Each command defaults to [http://localhost:3000](http://localhost:3000). To run the options simultaneously, pass a different port to each workspace command, for example:

```bash
npm run dev:option-a -- --port 3001
npm run dev:option-b -- --port 3002
npm run dev:option-c -- --port 3003
```

Build all three options with `npm run build`, or build one with `npm run build:option-a`, `npm run build:option-b`, or `npm run build:option-c`.

## Vercel projects

Import this Git repository three times in Vercel and configure the Root Directory for each project:

| Project | Root Directory |
| --- | --- |
| ProSME Option A | `apps/option-a` |
| ProSME Option B | `apps/option-b` |
| ProSME Option C | `apps/option-c` |

Vercel should detect Next.js and the npm workspace automatically. Use the repository's normal production branch for all three projects.

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
