"use client";

import { GeneralButton } from "@/components/ui/button";
import { defaultPages, approvedPageParagraphs } from "../../ContentDefaults";
import { paragraphsToRichText } from "../../ContentRichText";
import { CmsCollectionDocumentEditor } from "./CmsCollectionDocumentEditor";
import type { useCmsFundingFocusContent } from "./useCmsFundingFocusContent";

type FocusContent = ReturnType<typeof useCmsFundingFocusContent>;

export function CmsFundingFocusSectorsEditor({ content }: { content: FocusContent }) {
  return (
    <section className="mt-8 min-w-0 border-t border-brand-navy/15 pt-6">
      <h3 className="text-xl font-semibold">Focus sectors</h3>
      <p>Edit the section heading and notice, or edit each sector below.</p>
      {content.isLoading ? <p>Loading focus sectors…</p> : null}
      {content.isError ? (
        <p role="alert">Focus sectors could not be loaded with your current access.</p>
      ) : null}
      {!content.isError && !content.isLoading ? (
        <>
          <CmsCollectionDocumentEditor
            collectionSlug="pages"
            id={content.pageId}
            label="Edit heading and notice"
            onSave={content.refresh}
            initialData={{
              slug: "eligibility",
              title: defaultPages.eligibility.title,
              summary: defaultPages.eligibility.summary,
              content: paragraphsToRichText(approvedPageParagraphs.eligibility),
              layout: defaultPages.eligibility.blocks,
            }}
          />
          <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {content.sectors.map((sector) => (
              <li className="min-w-0" key={sector.id}>
                <CmsCollectionDocumentEditor
                  collectionSlug="eligibility-content"
                  id={sector.id}
                  label={sector.label}
                  onSave={content.refresh}
                />
              </li>
            ))}
          </ul>
          <CmsCollectionDocumentEditor
            collectionSlug="eligibility-content"
            label="Add focus sector"
            onSave={content.refresh}
            initialData={{ kind: "focusSector", description: "Priority area" }}
          />
          {content.hasNextPage || content.hasPrevPage ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <GeneralButton
                disabled={!content.hasPrevPage}
                onClick={() => content.changePage(content.page - 1)}
                type="button"
              >
                Previous sectors
              </GeneralButton>
              <span>Page {content.page}</span>
              <GeneralButton
                disabled={!content.hasNextPage}
                onClick={() => content.changePage(content.page + 1)}
                type="button"
              >
                Next sectors
              </GeneralButton>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
