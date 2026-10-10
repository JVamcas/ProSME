"use client";

import { ActionMenu } from "@/shared/ui/ActionMenu";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { Pagination } from "@/components/ui/pagination";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import {
  WorkflowTemplateVersionTable,
  type WorkflowTemplateVersionActions,
} from "./WorkflowTemplateVersionTable";

type Props = WorkflowTemplateVersionActions & {
  emptyMessage: string;
  items: WorkflowTemplateListItem[];
  isFetching: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEditDefinition: (template: WorkflowTemplateListItem) => void;
};

function columns(props: Props): DataTableColumn<WorkflowTemplateListItem>[] {
  return [
    {
      accessorKey: "name",
      header: "Template",
      enableSorting: false,
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-brand-navy">
            {row.original.name}
          </span>
          <span className="mt-1 block text-xs text-brand-navy/55">
            {row.original.code}
          </span>
        </div>
      ),
    },
    {
      id: "latestVersion",
      header: "Latest Version",
      enableSorting: false,
      cell: ({ row }) => `v${row.original.currentVersion.number}`,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu
          label={`Actions for template ${row.original.name}`}
          items={[
            {
              id: "edit-definition",
              label: "Edit definition",
              disabled: !props.canUpdate,
              onAction: () => props.onEditDefinition(row.original),
            },
          ]}
        />
      ),
    },
  ];
}

export function WorkflowTemplateTable(props: Props) {
  return (
    <section className="overflow-hidden bg-brand-white">
      <DataTable
        columns={columns(props)}
        data={props.items}
        emptyMessage={props.emptyMessage}
        renderExpandedRow={(template) => (
          <WorkflowTemplateVersionTable {...props} templateId={template.id} />
        )}
        footer={
          <Pagination
            disabled={props.isFetching}
            hasNextPage={props.page < props.totalPages}
            onNext={() => props.onPageChange(props.page + 1)}
            onPageSizeChange={props.onPageSizeChange}
            onPrevious={() => props.onPageChange(props.page - 1)}
            page={props.page}
            pageSize={props.pageSize}
            total={props.total}
          />
        }
        minWidth={700}
        rowKey={(item) => item.id}
      />
    </section>
  );
}
