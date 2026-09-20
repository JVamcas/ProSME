CREATE TABLE "app_condition_groups" (
  "id" uuid PRIMARY KEY NOT NULL,
  "definition" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_condition_groups_definition_check" CHECK (
    (jsonb_typeof("definition") = 'object'
    AND "definition"->>'kind' = 'GROUP'
    AND "definition"->>'id' = "id"::text) IS TRUE
  )
);
