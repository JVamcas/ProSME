import { DefaultTemplate } from "@payloadcms/next/templates";
import type { AdminViewServerProps } from "payload";

type Props = {
  children: React.ReactNode;
  view: AdminViewServerProps;
};

export function CmsPageShell({ children, view }: Props) {
  const { initPageResult, params, searchParams, viewType } = view;
  const { permissions, req, visibleEntities } = initPageResult;

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      viewType={viewType}
      visibleEntities={{
        collections: visibleEntities.collections,
        globals: visibleEntities.globals,
      }}
    >
      {children}
    </DefaultTemplate>
  );
}
