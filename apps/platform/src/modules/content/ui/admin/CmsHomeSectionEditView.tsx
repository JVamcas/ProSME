"use client";

import {
  ConfigProvider,
  DefaultEditView,
  ServerFunctionsContext,
  useConfig,
  useForm,
  useFormFields,
  useServerFunctions,
} from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import type { DocumentViewClientProps } from "payload";
import { useLayoutEffect, useMemo } from "react";
import {
  homeEditorFields,
  homeEditorFormState,
  homeEditorSectionForPath,
  homeEditorSelect,
  type HomeEditorSection,
} from "./HomeEditorSections";

function SectionFormState({ section }: { section: HomeEditorSection }) {
  const { dispatchFields, getFields } = useForm();
  const hasOtherFields = useFormFields(([fields]) => {
    const scoped = homeEditorFormState(fields, section);
    return Object.keys(scoped).length !== Object.keys(fields).length;
  });

  useLayoutEffect(() => {
    if (hasOtherFields) {
      dispatchFields({
        type: "REPLACE_STATE",
        state: homeEditorFormState(getFields(), section),
      });
    }
  }, [dispatchFields, getFields, hasOtherFields, section]);

  return null;
}

export default function CmsHomeSectionEditView(props: DocumentViewClientProps) {
  const pathname = usePathname();
  const section = homeEditorSectionForPath(pathname);
  const { config } = useConfig();
  const serverFunctions = useServerFunctions();
  const scopedConfig = useMemo(() => {
    if (!section) return config;
    return {
      ...config,
      globals: config.globals.map((global) => {
        if (global.slug !== "homepage") return global;
        return { ...global, fields: homeEditorFields(global.fields, section) };
      }),
    };
  }, [config, section]);
  const scopedFunctions = useMemo(
    () => ({
      ...serverFunctions,
      getFormState: (args: Parameters<typeof serverFunctions.getFormState>[0]) => {
        // Media drawers retain their complete native form and schema.
        if (!section || args.globalSlug !== "homepage") {
          return serverFunctions.getFormState(args);
        }
        return serverFunctions.getFormState({
          ...args,
          select: homeEditorSelect(section),
        });
      },
    }),
    [section, serverFunctions],
  );

  return (
    <ConfigProvider config={scopedConfig} key={section}>
      <ServerFunctionsContext.Provider value={scopedFunctions}>
        <DefaultEditView
          {...props}
          BeforeDocumentControls={
            <>
              {section ? <SectionFormState section={section} /> : null}
              {props.BeforeDocumentControls}
            </>
          }
        />
      </ServerFunctionsContext.Provider>
    </ConfigProvider>
  );
}
