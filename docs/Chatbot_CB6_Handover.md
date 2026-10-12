# Visitor chatbot handover

Date: 2026-10-10. Operational and stakeholder acceptance remains pending.

The public website composes the programme assistant under its existing query
provider. Staff control availability in **Chatbot > Settings**. A disabled bot
has no launcher. Turning it off also rejects public operations on the server.
The browser refreshes availability every 30 seconds and on focus; server checks
remain authoritative between refreshes. A failed availability refresh disables
the open panel's forms and offers the programme contact link.

## Visitor journey

1. Select **Ask about funding**. The floating chat window shows a welcome message,
   suggested questions and a bottom message composer. Sending the first question
   accepts the short disclosure and creates the session; opening the window alone
   does not. Full notice and retention periods are under **Privacy details**.
   Programme, FAQ, contact, privacy and restart actions are in the options menu.
2. Ask a question about published programme information. Answers show the
   server-approved text and its source links. If the assistant asks which call
   applies, select a call and resend the retained question.
3. An unanswered question automatically saves a support case. The panel shows
   its reference and whether a staff notification was queued. Queued does not
   mean delivered. If none could be queued, the visitor is directed to contact
   the team with the reference.
4. Expand **Request staff follow-up** to optionally submit a name and email with separate consent.
   The case exists even if they skip this step. Contact details go to the case
   endpoint and are excluded from question/model requests.
5. Closing the panel preserves the current session on the page. Starting a new
   conversation, expiry or a reload clears the browser's current history. This
   does not delete a saved staff case. Session credentials and transcripts are
   held in memory; no local/session storage is used. The conversation area is
   masked from the existing heatmap collector. A session accepts at most 30 turns.

Standalone greetings such as “Hi” receive a fixed welcome reply without a model
request, support case or notification. Programme questions continue through the
approved knowledge boundary. Support references and delivery details are available
under **Support details**. Enter sends a message; Shift+Enter inserts a newline.

Support is asynchronous. The widget does not promise response times, establish
eligibility or show staff responses. Human follow-up uses the team's agreed
support process and the optional consented email address.

## Staff and operations

Use **Chatbot > Knowledge base** to activate published resources. Confirm
automatic synchronization creates verified immutable artifacts in the intended
environment and that the active PostgreSQL pointer references those artifacts.
Public Contact knowledge is programme contact information; visitor contact is
private case data. A new case or resolution never trains the bot or changes
its knowledge.

After migration `0197`, authorized staff can use **Upload document** in the table
toolbar for PDF, DOCX or UTF-8 TXT programme documents up to 5 MiB. Uploaded
documents start inactive and open a readable extracted-text preview. Review that
text before activating the row: activation publishes the text for visitor source
links and chatbot answers. Click the row name to review it again; deactivate the
row to remove it from answers and public source links. Funding calls, FAQs and
eligibility rulesets continue to come from their existing modules. Scanned PDFs
need a text layer. Upload requires the separate document-upload permission.

Migration `0196_chatbot_support_role.sql` bootstraps the **Chatbot Support** role
(`chatbot_support`) without assigning any people. Authorized administrators,
including Lenis when granted role-management access, use the existing user/access
screen to add or remove staff membership. Members can read all chatbot cases,
assign cases to authorized staff, and resolve cases currently assigned to them.
The role grants no knowledge-base, chatbot-settings or role-management access.

On first bootstrap, an empty `chatbot.case.created` notification audience is
configured to email the role's eligible members. Existing recipient configuration
is preserved. Rerunning the migration preserves edited grants and routing, as
well as membership. Removing a member is checked again before queued delivery;
their other roles may still grant case access. An empty support role does not
prevent visitors from saving cases, but no staff notification is queued.

Publish the existing `chatbot.case.created` email template and verify delivery.
The email contains a reference and `/admin/chatbot/cases/<case-id>` link. It does
not contain the transcript or visitor email. Monitor delivery state in the
existing notification workspace; retries use the original occurrence.

Open **Chatbot > Escalated cases**, assign an authorized staff member when needed,
review the screened history and optional contact, and move the case to **In
progress**. After human follow-up, choose **Resolved** and enter a resolution note.
Permission and assignment checks apply to every read and update. If another staff
member changes the case, reload before saving. Staff resolutions remain outside
the knowledge base.

Schedule authenticated `POST /api/internal/chatbot/process` using
`Authorization: Bearer <CHATBOT_PROCESSOR_SECRET>` to synchronize resources and
clean expired material. Schedule the existing
`POST /api/internal/notifications/process` separately with its notification
processor secret. A one-minute interval is a suggested initial operational
choice; confirm it meets the selected retention and delivery expectations.
Cleanup and dispatch are bounded: repeat batches until caught up and monitor
failures/backlog. Do not place secrets or transcripts in handover evidence.

Before public activation, confirm migrations through `0192`, the intended
environment, private bucket access, Google project/model configuration, approved
notice/retention periods, active source coverage, recipients/template/channel and
both scheduled processors. Verify real provider logging, caching and applicable
abuse-monitoring conditions using Google's
[data-retention guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention)
and the [configured model contract](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash).
Application payload tests cannot establish provider-side privacy settings.

For service trouble, disable **Enable AI answers** to stop model requests while
retaining unresolved-case handling. Disable **Enable chatbot** to stop all public
session operations. Existing server checks also suppress in-flight answers.
Investigate artifact synchronization, delivery history, processor failures and
provider health; use case references and correlation IDs without logging text.

## Acceptance procedure and written record

Use synthetic questions and contact addresses for initial checks. Record the
environment, deployed revision, date, operator, expected result, observed result
and evidence location for each row. Keep identity/contact evidence in authorized
operational storage, not this repository.

| Check | Required observation | Status |
| --- | --- | --- |
| Desktop, tablet and mobile | Launcher/panel/forms readable, no horizontal overflow, all controls reachable at 320px and larger, portrait/landscape and 200% zoom | Pending browser review |
| Keyboard and screen reader | Named dialog, labelled inputs, errors announced, source links usable, focus trapped while open, Escape closes, focus returns to launcher | DOM checks implemented; browser/screen-reader review pending |
| Known public question | Correct approved passage and working citation from a current activated resource; content owner agrees it answers the question | Pending deployed review |
| Ambiguous/unknown question | Call selection works; unknown question saves one case even without contact; retry does not duplicate case/delivery | Synthetic automated coverage; deployed review pending |
| Actual delivery | Observe notification occurrence and provider status, then receipt in the authorized staff inbox and working protected link | Pending real delivery |
| Staff access and resolution | Anonymous/ungranted/incorrect-assignment access denied; authorized staff see history/contact and save a resolution note | Synthetic automated coverage; deployed review pending |
| Privacy and retention | Effective notice accepted, provider settings recorded, protected history expires, scheduled cleanup removes expired material | Pending operational review |
| Shutdown and recovery | Disable during a session and a pending answer; confirm no completion; re-enable and verify a fresh accepted journey | Backend automated coverage; deployed review pending |

Run the prepared synthetic browser scenario with an existing usable browser:

```sh
npm run test:public --workspace @prosme/platform -- chatbot-responsive.spec.ts
```

The normal Playwright configuration covers desktop, Pixel 5 and iPad Chromium.
It requires a working local website and its CMS configuration. HTTP responses in
this scenario are synthetic; it does not establish live backend/email acceptance.
Also complete the deployed journey above with live services.

Written stakeholder acceptance must name the content owner, support owner and
operational owner (one person may hold multiple responsibilities), acceptance
date/environment/revision, reviewed evidence and any explicitly accepted limits.
Record the approved notice/retention, known-answer examples, actual inbox receipt,
case resolution and provider/bucket verification. Until that record exists,
CB6's acceptance gate remains pending even when implementation checks pass.
