"use client";

import { GeneralButton } from "@/components/ui/button";
import { CmsCollectionDocumentEditor } from "./CmsCollectionDocumentEditor";
import type { useCmsFaqContent } from "./useCmsFaqContent";

export function CmsFaqQuestionsEditor({
  content,
}: {
  content: ReturnType<typeof useCmsFaqContent>;
}) {
  return (
    <section className="mb-8 min-w-0 rounded-2xl border border-solid border-brand-navy/15 bg-brand-white p-6">
      <h2 className="m-0 text-xl font-semibold">Questions and answers</h2>
      <p>Edit an answer below. Use display order to arrange the questions.</p>
      {content.isLoading ? <p>Loading FAQs…</p> : null}
      {content.isError ? (
        <p role="alert">FAQs could not be loaded with your current access.</p>
      ) : null}
      {!content.isLoading && !content.isError ? (
        <>
          <ul className="grid list-none gap-3 p-0">
            {content.faqs.map((faq) => (
              <li key={faq.id}>
                <CmsCollectionDocumentEditor
                  collectionSlug="faqs"
                  id={faq.id}
                  label={faq.question}
                  onSave={content.refresh}
                />
              </li>
            ))}
          </ul>
          {!content.faqs.length ? <p>No FAQ questions have been added yet.</p> : null}
          <div className="mt-6">
            <CmsCollectionDocumentEditor
              collectionSlug="faqs"
              label="Add question"
              onSave={content.refresh}
            />
          </div>
          {content.hasNextPage || content.hasPrevPage ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <GeneralButton
                disabled={!content.hasPrevPage}
                onClick={() => content.changePage(content.page - 1)}
                type="button"
              >
                Previous questions
              </GeneralButton>
              <span>Page {content.page}</span>
              <GeneralButton
                disabled={!content.hasNextPage}
                onClick={() => content.changePage(content.page + 1)}
                type="button"
              >
                Next questions
              </GeneralButton>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
