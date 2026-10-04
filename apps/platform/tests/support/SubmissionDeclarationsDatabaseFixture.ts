type DatabaseQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export async function insertSubmissionDeclarations(
  query: DatabaseQuery,
  formVersionId: string,
) {
  const sectionId = "6a666666-6666-4666-8666-666666666666";
  await query(
    `INSERT INTO app_form_sections
      (id, form_version_id, key, title, display_order)
     VALUES ($1, $2, 'DECLARATIONS_AND_CONSENT', 'Declarations and consent', 2)`,
    [sectionId, formVersionId],
  );
  await query(
    `INSERT INTO app_form_fields
      (form_version_id, section_id, key, label, type, required, display_order)
     VALUES
      ($1, $2, 'DECLARATION_ACCURACY_CONFIRMATION', 'Accuracy', 'TEXT', true, 1),
      ($1, $2, 'DECLARATION_AUTHORITY_CONFIRMATION', 'Authority', 'TEXT', true, 2),
      ($1, $2, 'DATA_PROCESSING_CONSENT', 'Data processing', 'TEXT', true, 3),
      ($1, $2, 'VERIFICATION_CONSENT', 'Verification', 'TEXT', true, 4)`,
    [formVersionId, sectionId],
  );
}
