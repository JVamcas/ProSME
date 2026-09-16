import type { z } from "zod";

import { formCommandSchema, formDefinitionDialogSchema, formEditorSchema, taskFormSubmissionSchema } from "./FormSchemas";

export type CreateFormInput = z.infer<typeof formDefinitionDialogSchema>;
export type UpdateFormInput = z.infer<typeof formEditorSchema>;
export type FormCommandInput = z.infer<typeof formCommandSchema>;
export type TaskFormSubmissionInput = z.infer<typeof taskFormSubmissionSchema>;
