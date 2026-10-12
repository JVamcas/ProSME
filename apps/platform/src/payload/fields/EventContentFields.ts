import type { Field } from "payload";
import {
  FixedToolbarFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import {
  eventTypeOptions,
  validateEventRecordingUrl,
  validateEventTimezone,
} from "@/modules/content/domain/EventMetadata";
import { publishingFields } from "./publishing";
import { seoFields } from "./seo";

const editorSections: Field[] = [
  {
    type: "group",
    label: false,
    admin: { className: "event-form-main" },
    fields: [
      { name: "title", type: "text", required: true },
      {
        name: "slug",
        type: "text",
        required: true,
        unique: true,
        index: true,
        admin: { hidden: true },
      },
      {
        name: "summary",
        type: "textarea",
        required: true,
        admin: { rows: 3 },
      },
      {
        name: "body",
        label: "Description",
        type: "richText",
        required: true,
        editor: lexicalEditor({
          features: ({ defaultFeatures }) => [
            ...defaultFeatures,
            FixedToolbarFeature(),
          ],
        }),
      },
      {
        name: "startsAt",
        label: "Start date and time",
        type: "date",
        required: true,
        admin: {
          components: {
            Field: "./modules/content/ui/admin/CmsEventScheduleField.tsx",
          },
        },
      },
      { name: "endsAt", type: "date", admin: { hidden: true } },
      {
        type: "row",
        fields: [
          {
            name: "timezone",
            label: "Timezone",
            type: "text",
            required: true,
            defaultValue: "Africa/Windhoek",
            validate: validateEventTimezone,
            admin: {
              width: "50%",
              components: {
                Field: "./modules/content/ui/admin/CmsEventTimezoneField.tsx",
              },
            },
          },
          {
            name: "location",
            label: "Venue",
            type: "text",
            required: true,
            admin: { width: "50%" },
          },
        ],
      },
      {
        name: "image",
        label: "Event image",
        type: "upload",
        relationTo: "media",
        filterOptions: { mimeType: { contains: "image/" } },
        admin: {
          components: {
            Field: "./modules/content/ui/admin/CmsEventImageField.tsx",
          },
        },
      },
      {
        name: "eventType",
        label: "Event type",
        type: "select",
        options: eventTypeOptions,
        required: true,
        defaultValue: "information-session",
        admin: { hidden: true },
      },
      {
        name: "registrationUrl",
        label: "Existing external registration URL",
        type: "text",
        admin: { hidden: true },
      },
    ],
  },
  {
    type: "group",
    label: "Publication",
    admin: {
      components: {
        Field: "./modules/content/ui/admin/CmsEventPublicationField.tsx",
      },
    },
    fields: [
      ...[...publishingFields, ...seoFields].map((field): Field => {
        const hiddenField: Field = { ...field };
        hiddenField.admin = { ...hiddenField.admin, hidden: true };
        return hiddenField;
      }),
    ],
  },
  {
    name: "registrationManagement",
    type: "ui",
    admin: {
      components: {
        Field: "./modules/content/ui/admin/CmsEventRegistrationPanel.tsx",
      },
    },
  },
  {
    type: "group",
    label: "Recording",
    admin: {
      description:
        "Publish after the session. Only published past events appear in the recording archive.",
      components: {
        Field: "./modules/content/ui/admin/CmsEventRecordingField.tsx",
      },
    },
    fields: [
      {
        name: "recordingUrl",
        label: "Recording URL",
        type: "text",
        validate: validateEventRecordingUrl,
      },
      {
        name: "category",
        type: "text",
        required: true,
        defaultValue: "General",
        admin: {
          components: {
            Field: "./modules/content/ui/admin/CmsEventCategoryField.tsx",
          },
        },
      },
    ],
  },
];

// Unnamed layout groups preserve existing field names, storage and version paths.
export const eventContentFields: Field[] = [
  {
    type: "group",
    label: false,
    admin: {
      components: {
        Field: "./modules/content/ui/admin/CmsEventContentGroupField.tsx",
      },
    },
    fields: [
      editorSections[0],
      {
        type: "group",
        label: false,
        admin: { className: "event-form-aside" },
        fields: editorSections.slice(1),
      },
    ],
  },
];
