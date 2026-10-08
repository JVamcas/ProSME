import { z } from "zod";
import { reportQueryLimits } from "./ReportQueryLimits";

const decimalSchema = z.string().regex(/^-?(?:0|[1-9]\d{0,27})(?:\.\d{1,10})?$/);
export const reportParameterDefinitionSchema = z
  .object({
    name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,63}$/),
    position: z.number().int().min(1).max(reportQueryLimits.parameters),
    type: z.enum([
      "text",
      "uuid",
      "date",
      "timestamp",
      "decimal",
      "integer",
      "boolean",
      "timezone",
      "uuid-array",
      "text-array",
    ]),
    nullable: z.boolean().default(false),
    binding: z.enum(["value", "run-at", "source-timezone"]).default("value"),
    defaultValue: z.unknown().optional(),
  })
  .strict();

export const reportParameterDefinitionsSchema = z
  .array(reportParameterDefinitionSchema)
  .max(reportQueryLimits.parameters)
  .superRefine((definitions, context) => {
    const positions = definitions.map((item) => item.position);
    const names = definitions.map((item) => item.name);
    if (
      new Set(names).size !== names.length ||
      definitions.some((item, index) => item.position !== index + 1) ||
      new Set(positions).size !== positions.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Parameters require unique names and consecutive ordered positions.",
      });
    }
    for (const definition of definitions) {
      if (
        (definition.binding === "run-at" && definition.type !== "timestamp") ||
        (definition.binding === "source-timezone" && definition.type !== "timezone")
      ) {
        context.addIssue({
          code: "custom",
          message: "Server parameter bindings must use their declared type.",
        });
      }
    }
  });

export type ReportParameterDefinition = z.infer<typeof reportParameterDefinitionSchema>;

const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "A valid IANA timezone is required.");

function valueSchema(definition: ReportParameterDefinition) {
  const schemas = {
    text: z.string().max(500),
    uuid: z.uuid(),
    date: z.iso.date(),
    timestamp: z.iso.datetime({ offset: true }),
    decimal: decimalSchema,
    integer: z.number().int().safe(),
    boolean: z.boolean(),
    timezone: timezoneSchema,
    "uuid-array": z.array(z.uuid()).max(100),
    "text-array": z.array(z.string().max(100)).max(100),
  };
  const schema = schemas[definition.type];
  return definition.nullable ? schema.nullable() : schema;
}

export function bindReportParameters(input: {
  definitions: unknown;
  values: Record<string, unknown>;
  runAt: string;
  timezone: string;
}) {
  const definitions = reportParameterDefinitionsSchema.parse(input.definitions);
  const shape: Record<string, z.ZodType> = {};
  for (const definition of definitions) {
    if (definition.defaultValue !== undefined) {
      valueSchema(definition).parse(definition.defaultValue);
    }
    if (definition.binding === "value") {
      shape[definition.name] = valueSchema(definition).optional();
    }
  }
  const values = z.object(shape).strict().parse(input.values);
  return definitions.map((definition) => {
    const value =
      definition.binding === "run-at"
        ? input.runAt
        : definition.binding === "source-timezone"
          ? input.timezone
          : (values[definition.name] ?? definition.defaultValue);
    // An explicit nullable null must not be replaced by a non-null default.
    const resolved =
      definition.binding === "value" && Object.hasOwn(values, definition.name)
        ? values[definition.name]
        : value;
    return valueSchema(definition).parse(resolved);
  });
}
