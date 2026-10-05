export default function CmsHomeSectionEditorHeader({
  anchor,
  title,
  description,
}: {
  anchor: string;
  title: string;
  description: string;
}) {
  return (
    <section id={anchor}>
      <h2 className="m-0 text-2xl font-bold text-brand-navy">
        {title}
      </h2>
      <p className="mt-2 mb-0 text-sm leading-6 text-brand-navy/75">
        {description}
      </p>
    </section>
  );
}
