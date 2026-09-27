import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";

type Props = {
  instructions: string;
  question: string;
};

function containsHtml(value: string) {
  return /<\/?[a-z][^>]*>/i.test(value);
}

export function WorkflowRfiInstructions({ instructions, question }: Props) {
  if (containsHtml(instructions)) {
    return (
      <SanitizedRichTextContent
        className="mt-4 text-sm"
        sanitizedHtml={instructions}
      />
    );
  }
  return (
    <div className="mt-4">
      {question ? (
        <h2 className="text-lg font-bold text-brand-navy">{question}</h2>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy/75">
        {instructions}
      </p>
    </div>
  );
}
