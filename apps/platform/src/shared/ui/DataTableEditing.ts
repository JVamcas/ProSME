import type { RowData } from "@tanstack/react-table";
import type { z } from "zod";

export type DataTableCellEditor<TData extends RowData> = {
  /** Accessible name for the cell input and editing controls. */
  label: string;
  /** Validates the input string and may transform it to the saved value. */
  schema: z.ZodType<unknown, string>;
  inputType?: "text" | "number" | "email" | "date";
  options?: ReadonlyArray<{ label: string; value: string }>;
  canEdit?: (row: TData) => boolean;
  formatInput?: (value: unknown, row: TData) => string;
};

export type DataTableCellEdit<TData extends RowData> = {
  row: TData;
  rowId: string;
  columnId: string;
  previousValue: unknown;
  value: unknown;
};
